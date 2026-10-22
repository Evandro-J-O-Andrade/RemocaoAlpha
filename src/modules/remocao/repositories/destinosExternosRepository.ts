import { supabase } from '@/lib/supabase/client'

export interface DestinoExterno {
  id: string
  tenant_id: string
  nome: string
  tipo: string
  endereco: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  telefone: string | null
  contato_nome: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export class DestinosExternosRepository {
  static async list(tenantId: string, search?: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }
    let query = supabase
      .from('remocao_destinos_externos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (search) query = query.ilike('nome', `%${search}%`)
    const { data, error } = await query
    return { data: data as DestinoExterno[] | null, error }
  }

  static async create(tenantId: string, payload: Partial<DestinoExterno>) {
    const { data, error } = await supabase
      .from('remocao_destinos_externos')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single()
    return { data: data as DestinoExterno | null, error }
  }

  static async update(id: string, payload: Partial<DestinoExterno>) {
    const { data, error } = await supabase
      .from('remocao_destinos_externos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    return { data: data as DestinoExterno | null, error }
  }
}
