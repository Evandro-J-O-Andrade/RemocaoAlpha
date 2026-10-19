import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import type { Remocao, RemocaoDashboardView, RemocaoSummary, StatusRemocao, RemocaoDetail } from '@/modules/remocao/types'

type Tables = Database['public']['Tables']

export class RemocaoRepository {
  // --- Remocao (main entity) ---
  static async list(tenantId: string, opts?: { status?: string; prioridade?: string; search?: string }) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    let query = supabase
      .from('remocao')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (opts?.status) query = query.eq('status', opts.status as any)
    if (opts?.prioridade) query = query.eq('prioridade', opts.prioridade as any)
    if (opts?.search) query = query.or(`paciente_nome.ilike.%${opts.search}%,numero.ilike.%${opts.search}%`)

    const { data, error } = await query
    return { data: data as Remocao[] | null, error }
  }

  static async getDashboardView(tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase
      .from('remocao_dashboard')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    return { data: data as RemocaoDashboardView[] | null, error }
  }

  static async getSummary(tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase
      .from('remocao_summary')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return { data: data as RemocaoSummary | null, error }
  }

  static async getById(id: string, tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase
      .from('remocao')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    return { data: data as Remocao | null, error }
  }

  static async getDetail(id: string, tenantId: string): Promise<{ data: RemocaoDetail | null; error: any }> {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    // Fetch the main remocao with tenant scoping (IDOR protection)
    const { data: remocao, error: e1 } = await this.getById(id, tenantId)
    if (e1 || !remocao) return { data: null, error: e1 || new Error('Remocao not found') }

    // Fetch related data in parallel — all scoped via RLS, but explicit tenant
    // scoping provides defense-in-depth
    const [
      pacientesRes,
      equipesRes,
      avaliacaoRes,
      checklistRes,
      intercorrenciasRes,
      historicoRes,
      eventosRes,
      documentosRes,
      checkinRes,
      checkoutRes,
      destinoRes,
      gpsRes,
    ] = await Promise.all([
      supabase.from('remocao_paciente').select('*').eq('remocao_id', id),
      supabase.from('remocao_equipe').select('*, remocao_equipe_membro!inner(*)').eq('remocao_id', id),
      supabase.from('remocao_avaliacao_clinica').select('*').eq('remocao_id', id).maybeSingle(),
      supabase.from('remocao_checklist').select('*').eq('remocao_id', id),
      supabase.from('remocao_intercorrencia').select('*').eq('remocao_id', id),
      supabase.from('remocao_status_historico').select('*').eq('remocao_id', id).order('created_at', { ascending: true }),
      supabase.from('remocao_evento').select('*').eq('remocao_id', id).order('created_at', { ascending: true }),
      supabase.from('remocao_documento').select('*').eq('remocao_id', id),
      supabase.from('remocao_checkin').select('*').eq('remocao_id', id).order('created_at', { ascending: false }).maybeSingle(),
      supabase.from('remocao_checkout').select('*').eq('remocao_id', id).order('created_at', { ascending: false }).maybeSingle(),
      supabase.from('remocao_destino_confirmacao').select('*').eq('remocao_id', id).order('created_at', { ascending: false }).maybeSingle(),
      supabase.from('remocao_gps_posicao').select('*').eq('remocao_id', id).order('recorded_at', { ascending: false }).limit(10),
    ])

    const detail: RemocaoDetail = {
      remocao,
      pacientes: pacientesRes.data || [],
      equipes: (equipesRes.data || []).map((e: any) => ({ ...e, membros: e.remocao_equipe_membro || [] })),
      avaliacao_clinica: avaliacaoRes.data || null,
      checklist: checklistRes.data || [],
      intercorrencias: intercorrenciasRes.data || [],
      historico_status: historicoRes.data || [],
      eventos: eventosRes.data || [],
      documentos: documentosRes.data || [],
      checkin: checkinRes.data || null,
      checkout: checkoutRes.data || null,
      destino_confirmacao: destinoRes.data || null,
      gps_posicoes_recent: gpsRes.data || [],
      rota: null,
    }

    return { data: detail, error: null }
  }

  static async create(payload: Tables['remocao']['Insert']) {
    if (!payload.tenant_id) return { data: null, error: new Error('Tenant ID required') }

    // Auto-generate numero using backend function (tenant-scoped via RPC)
    if (!payload.numero) {
      const { data: numero, error: numErr } = await supabase.rpc('generate_remocao_number', {
        p_tenant_id: payload.tenant_id,
      })
      if (numErr) return { data: null, error: numErr }
      payload = { ...payload, numero: numero as string }
    }

    const { data, error } = await supabase.from('remocao').insert(payload).select().single()
    return { data: data as Remocao | null, error }
  }

  static async update(id: string, tenantId: string, payload: Tables['remocao']['Update']) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase
      .from('remocao')
      .update(payload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    return { data: data as Remocao | null, error }
  }

  static async updateStatus(remocaoId: string, tenantId: string, status: StatusRemocao, usuarioId: string, motivo?: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase.rpc('update_remocao_status', {
      p_remocao_id: remocaoId,
      p_status_novo: status,
      p_usuario_id: usuarioId,
      p_motivo: motivo || null,
    })
    return { data, error }
  }

  // --- Patient ---
  static async addPaciente(payload: Tables['remocao_paciente']['Insert']) {
    const { data, error } = await supabase.from('remocao_paciente').insert(payload).select().single()
    return { data: data as Tables['remocao_paciente']['Row'] | null, error }
  }

  // --- Team ---
  static async montarEquipe(remocaoId: string, tenantId: string, membros: { profissional_id: string; profissional_nome: string; role: string; profissional_cargo?: string }[]) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data: equipe, error: e1 } = await supabase.from('remocao_equipe').insert({
      remocao_id: remocaoId,
      tenant_id: tenantId,
      nome: 'Equipe ' + remocaoId,
      nivel_suporte: 'intermediario' as const,
    }).select().single()
    if (e1 || !equipe) return { data: null, error: e1 }

    const membrosPayload = membros.map((m) => ({
      equipe_id: equipe.id,
      profissional_id: m.profissional_id,
      profissional_nome: m.profissional_nome,
      profissional_cargo: m.profissional_cargo,
      role: m.role as any,
    }))

    const { data: membrosData, error: e2 } = await supabase.from('remocao_equipe_membro').insert(membrosPayload).select()
    return { data: { equipe, membros: membrosData }, error: e2 }
  }

  // --- Vehicle ---
  static async listVeiculosDisponiveis(tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase.from('remocao_veiculo')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('situacao', 'disponivel')
    return { data: data as Tables['remocao_veiculo']['Row'][] | null, error }
  }

  static async escalarVeiculo(remocaoId: string, tenantId: string, veiculoId: string) {
    const { data, error } = await supabase
      .from('remocao')
      .update({ veiculo_id: veiculoId })
      .eq('id', remocaoId)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    return { data: data as Remocao | null, error }
  }

  // --- Driver ---
  static async listMotoristasDisponiveis(tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase.from('remocao_motorista')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'disponivel')
    return { data: data as Tables['remocao_motorista']['Row'][] | null, error }
  }

  static async atualizarStatusMotorista(motoristaId: string, tenantId: string, status: string) {
    const { data, error } = await supabase
      .from('remocao_motorista')
      .update({ status: status as any })
      .eq('id', motoristaId)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    return { data: data as Tables['remocao_motorista']['Row'] | null, error }
  }

  // --- GPS ---
  static async insertGpsPosicao(payload: Tables['remocao_gps_posicao']['Insert']) {
    const { data, error } = await supabase.from('remocao_gps_posicao').insert(payload).select().single()
    return { data: data as Tables['remocao_gps_posicao']['Row'] | null, error }
  }

  static async getGpsUltimasPosicoes(remocaoId: string) {
    const { data, error } = await supabase
      .from('remocao_gps_posicao')
      .select('*')
      .eq('remocao_id', remocaoId)
      .order('recorded_at', { ascending: false })
      .limit(50)
    return { data: data as Tables['remocao_gps_posicao']['Row'][] | null, error }
  }

  // --- Documents ---
  static async uploadDocumento(remocaoId: string, tenantId: string, file: File, tipo: string, titulo: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required'), fileUrl: null }

    const fileName = `${remocaoId}/${crypto.randomUUID()}_${file.name}`

    // Upload to storage — tenant scoping is enforced by RLS policy on the bucket
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('remocao-documentos')
      .upload(fileName, file)

    if (uploadErr) return { data: null, error: uploadErr, fileUrl: null }

    const { data, error } = await supabase.from('remocao_documento').insert({
      remocao_id: remocaoId,
      tenant_id: tenantId,
      tipo: tipo as Database['public']['Enums']['remocao_documento_tipo'],
      titulo,
      storage_bucket: 'remocao-documentos',
      storage_path: uploadData.path,
      file_size: file.size,
      mime_type: file.type,
      status: 'UPLOADED',
    }).select().single()

    // Use signed URL instead of public URL (bucket is private)
    const { data: signedUrl, error: signErr } = await supabase.storage
      .from('remocao-documentos')
      .createSignedUrl(uploadData.path, 3600)

    return {
      data: data as Tables['remocao_documento']['Row'] | null,
      error: error || signErr,
      fileUrl: signedUrl?.signedUrl || null,
    }
  }

  static async getDocumentoExtracao(_documentoId: string) {
    const { data, error } = await supabase
      .from('remocao_documento_extracao')
      .select('*')
      .eq('documento_id', _documentoId)
      .maybeSingle()
    return { data: data as Tables['remocao_documento_extracao']['Row'] | null, error }
  }

  static async saveDocumentoConferencia(_documentoId: string, payload: Tables['remocao_documento_conferencia']['Insert']) {
    const { data, error } = await supabase
      .from('remocao_documento_conferencia')
      .insert(payload)
      .select()
      .single()
    return { data: data as Tables['remocao_documento_conferencia']['Row'] | null, error }
  }

  static async updateDocumentoStatus(documentoId: string, tenantId: string, status: string) {
    const { data, error } = await supabase
      .from('remocao_documento')
      .update({ status: status as any, updated_at: new Date().toISOString() })
      .eq('id', documentoId)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    return { data: data as Tables['remocao_documento']['Row'] | null, error }
  }

  // --- Checklist ---
  static async createChecklistItem(_remocaoId: string, payload: Tables['remocao_checklist']['Insert']) {
    const { data, error } = await supabase.from('remocao_checklist').insert(payload).select().single()
    return { data: data as Tables['remocao_checklist']['Row'] | null, error }
  }

  static async updateChecklist(remocaoId: string, itemKey: string, checked: boolean, checkedBy: string, tenantId?: string) {
    let query = supabase
      .from('remocao_checklist')
      .update({
        checked,
        checked_by: checkedBy,
        checked_at: checked ? new Date().toISOString() : null,
      })
      .eq('remocao_id', remocaoId)
      .eq('item_key', itemKey)

    if (tenantId) {
      query = query.eq('remocao_id', remocaoId).filter('remocao_id', 'in',
        supabase.from('remocao').select('id').eq('tenant_id', tenantId) as any)
    }

    const { data, error } = await query.select().single()
    return { data: data as Tables['remocao_checklist']['Row'] | null, error }
  }

  static async getChecklistByRemocao(remocaoId: string) {
    const { data, error } = await supabase.from('remocao_checklist').select('*').eq('remocao_id', remocaoId)
    return { data: data as Tables['remocao_checklist']['Row'][] | null, error }
  }

  // --- Intercorrencia ---
  static async createIntercorrencia(payload: Tables['remocao_intercorrencia']['Insert']) {
    const { data, error } = await supabase.from('remocao_intercorrencia').insert(payload).select().single()
    return { data: data as Tables['remocao_intercorrencia']['Row'] | null, error }
  }

  // --- Checkin / Checkout ---
  static async createCheckin(payload: Tables['remocao_checkin']['Insert']) {
    const { data, error } = await supabase.from('remocao_checkin').insert(payload).select().single()
    return { data: data as Tables['remocao_checkin']['Row'] | null, error }
  }

  static async createCheckout(payload: Tables['remocao_checkout']['Insert']) {
    const { data, error } = await supabase.from('remocao_checkout').insert(payload).select().single()
    return { data: data as Tables['remocao_checkout']['Row'] | null, error }
  }

  // --- Eventos ---
  static async createEvento(payload: Tables['remocao_evento']['Insert']) {
    const { data, error } = await supabase.from('remocao_evento').insert(payload).select().single()
    return { data: data as Tables['remocao_evento']['Row'] | null, error }
  }

  // --- Unidades ---
  static async getUnidades(tenantId: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase.from('remocao_unidade')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
    return { data: data as Tables['remocao_unidade']['Row'][] | null, error }
  }

  static async getSetores(unidadeId: string, tenantId?: string) {
    let query = supabase.from('remocao_setor').select('*').eq('unidade_id', unidadeId).eq('ativo', true)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { data, error } = await query
    return { data: data as Tables['remocao_setor']['Row'][] | null, error }
  }

  // --- Tabela de referencia ---
  static async finalizarCheckout(remocaoId: string, kmInicial: number, kmFinal: number) {
    const { data, error } = await supabase.rpc('finalizar_checkout', {
      p_remocao_id: remocaoId,
      p_quilometragem_inicial: kmInicial,
      p_quilometragem_final: kmFinal,
    })
    return { data, error }
  }

  static async getTabelaReferencia(tenantId: string, tipo: string) {
    if (!tenantId) return { data: null, error: new Error('Tenant ID required') }

    const { data, error } = await supabase.from('remocao_tabela_referencia')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('tipo', tipo)
      .eq('ativo', true)
    return { data, error }
  }

  // --- Organizations (identity) ---
  static async getOrganizations() {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, nome, razao_social, ativo')
      .eq('ativo', true)
      .order('nome')
    return { data, error }
  }

  static async switchTenant(tenantId: string) {
    const { data, error } = await supabase.rpc('set_active_tenant', {
      p_tenant_id: tenantId,
    })
    return { data, error }
  }
}
