import { supabase } from '@/lib/supabase/client'

export interface RemocaoProcedimento {
  id: string
  tenant_id: string
  remocao_id: string
  sigtap_codigo: string | null
  sigtap_nome: string | null
  sigtap_valor_total: number | null
  sigtap_competencia: string | null
  cid10_codigo: string | null
  cid10_descricao: string | null
  cbo_codigo: string | null
  cbo_titulo: string | null
  observacao?: string | null
  created_at: string
  created_by: string | null
}

export class RemocaoProcedimentoRepository {
  static async listByRemocao(tenantId: string, remocaoId: string) {
    if (!tenantId || !remocaoId) return { data: null, error: new Error('Tenant ID and Remocao ID required') }
    const { data, error } = await supabase
      .from('remocao_procedimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('remocao_id', remocaoId)
      .order('created_at', { ascending: true })
    return { data: data as RemocaoProcedimento[] | null, error }
  }

  static async create(tenantId: string, payload: Omit<RemocaoProcedimento, 'id' | 'tenant_id' | 'created_at' | 'created_by'>) {
    const { data, error } = await supabase
      .from('remocao_procedimento')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single()
    return { data: data as RemocaoProcedimento | null, error }
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('remocao_procedimento')
      .delete()
      .eq('id', id)
    return { error }
  }

  static async deleteByRemocao(tenantId: string, remocaoId: string) {
    const { error } = await supabase
      .from('remocao_procedimento')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('remocao_id', remocaoId)
    return { error }
  }
}
