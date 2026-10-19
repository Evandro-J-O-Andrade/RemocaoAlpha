import type { Database } from '@/lib/supabase/types'

// Re-export database types
export type { Database } from '@/lib/supabase/types'

// Status type with human-friendly helpers
export type StatusRemocao = Database['public']['Enums']['remocao_status']
export type FinalidadeRemocao = Database['public']['Enums']['remocao_finalidade']
export type TipoTransporte = Database['public']['Enums']['remocao_tipo_transporte']
export type NivelSuporte = Database['public']['Enums']['remocao_nivel_suporte']
export type PrioridadeRemocao = Database['public']['Enums']['remocao_prioridade']
export type NecessidadeMedica = Database['public']['Enums']['remocao_necessidade_medica']
export type CondicaoClinica = Database['public']['Enums']['remocao_condicao_clinica']
export type TipoIntercorrencia = Database['public']['Enums']['remocao_tipo_intercorrencia']
export type EquipeRole = Database['public']['Enums']['remocao_equipe_role']
export type TipoVeiculo = Database['public']['Enums']['remocao_tipo_veiculo']
export type SituacaoVeiculo = Database['public']['Enums']['remocao_situacao_veiculo']
export type MotoristaStatus = Database['public']['Enums']['remocao_motorista_status']
export type DocumentoStatus = Database['public']['Enums']['remocao_documento_status']
export type DocumentoTipo = Database['public']['Enums']['remocao_documento_tipo']
export type ChecklistSecao = Database['public']['Enums']['remocao_checklist_secao']

// Domain entity types
export type Remocao = Database['public']['Tables']['remocao']['Row']
export type RemocaoPaciente = Database['public']['Tables']['remocao_paciente']['Row']
export type RemocaoEquipe = Database['public']['Tables']['remocao_equipe']['Row']
export type RemocaoEquipeMembro = Database['public']['Tables']['remocao_equipe_membro']['Row']
export type RemocaoVeiculo = Database['public']['Tables']['remocao_veiculo']['Row']
export type RemocaoMotorista = Database['public']['Tables']['remocao_motorista']['Row']
export type RemocaoAvaliacaoClinica = Database['public']['Tables']['remocao_avaliacao_clinica']['Row']
export type RemocaoChecklist = Database['public']['Tables']['remocao_checklist']['Row']
export type RemocaoIntercorrencia = Database['public']['Tables']['remocao_intercorrencia']['Row']
export type RemocaoStatusHistorico = Database['public']['Tables']['remocao_status_historico']['Row']
export type RemocaoEvento = Database['public']['Tables']['remocao_evento']['Row']
export type RemocaoDocumento = Database['public']['Tables']['remocao_documento']['Row']
export type RemocaoDocumentoExtracao = Database['public']['Tables']['remocao_documento_extracao']['Row']
export type RemocaoDocumentoConferencia = Database['public']['Tables']['remocao_documento_conferencia']['Row']
export type RemocaoGpsPosicao = Database['public']['Tables']['remocao_gps_posicao']['Row']
export type RemocaoAuditoria = Database['public']['Tables']['remocao_auditoria']['Row']
export type RemocaoUnidade = Database['public']['Tables']['remocao_unidade']['Row']
export type RemocaoSetor = Database['public']['Tables']['remocao_setor']['Row']
export type RemocaoCheckin = Database['public']['Tables']['remocao_checkin']['Row']
export type RemocaoCheckout = Database['public']['Tables']['remocao_checkout']['Row']
export type RemocaoDestinoConfirmacao = Database['public']['Tables']['remocao_destino_confirmacao']['Row']

// Dashboard view types
export interface RemocaoDashboardView {
  id: string
  numero: string
  titulo?: string | null
  tenant_id: string
  paciente_nome: string
  paciente_prontuario?: string | null
  paciente_data_nascimento?: string | null
  paciente_sexo?: string | null
  paciente_diagnostico?: string | null
  paciente_condicao_clinica?: CondicaoClinica | null
  origem_unidade_nome?: string | null
  origem_setor_nome?: string | null
  origem_leito?: string | null
  destino_unidade_nome?: string | null
  destino_setor_nome?: string | null
  destino_endereco?: string | null
  destino_contato_nome?: string | null
  destino_contato_telefone?: string | null
  destino_confirmed_at?: string | null
  finalidade: FinalidadeRemocao
  tipo_transporte?: TipoTransporte | null
  nivel_suporte?: NivelSuporte | null
  prioridade: PrioridadeRemocao
  necessidade_medica: NecessidadeMedica
  status: StatusRemocao
  data_prevista?: string | null
  horario_previsto_saida?: string | null
  horario_previsto_atendimento?: string | null
  veiculo_id?: string | null
  veiculo_placa?: string | null
  veiculo_modelo?: string | null
  motorista_id?: string | null
  motorista_nome?: string | null
  motorista_status?: MotoristaStatus | null
  quilometragem_inicial?: number | null
  quilometragem_final?: number | null
  checkin_at?: string | null
  checkout_at?: string | null
  created_at: string
  updated_at: string
  motivo_cancelamento?: string | null
  tempo_espera?: string | null
  checklist_pct?: number | null
  checkin_motorista_at?: string | null
  checkout_motorista_at?: string | null
}

export interface RemocaoSummary {
  total_programadas: number
  aguardando_motorista: number
  em_deslocamento: number
  criticas: number
  concluidas: number
  pendentes: number
  intercorrencias: number
}

// Alert types (section 11 & 29)
export interface AlertaRemocao {
  id: string
  remocao_id: string
  tipo: 'visual' | 'sonoro'
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  titulo: string
  mensagem: string
  icone: string
  cor: 'scheduled' | 'waiting-team' | 'waiting-driver' | 'critical' | 'in-transit' | 'delivered' | 'cancelled'
  reconhecido: boolean
  reconhecido_por?: string | null
  reconhecido_at?: string | null
  created_at: string
}

// Clock/timer type (section 20)
export interface CronometroRemocao {
  remocao_id: string
  status: StatusRemocao
  esperando_equipe_ms: number
  esperando_motorista_ms: number
  esperando_saida_ms: number
  deslocamento_ms: number
  no_destino_ms: number
  total_ms: number
}

// Combined remoção detail view
export interface RemocaoDetail {
  remocao: Remocao
  pacientes: RemocaoPaciente[]
  equipes: (RemocaoEquipe & { membros: RemocaoEquipeMembro[] })[]
  avaliacao_clinica?: RemocaoAvaliacaoClinica | null
  checklist: RemocaoChecklist[]
  intercorrencias: RemocaoIntercorrencia[]
  historico_status: RemocaoStatusHistorico[]
  eventos: RemocaoEvento[]
  documentos: RemocaoDocumento[]
  checkin?: RemocaoCheckin | null
  checkout?: RemocaoCheckout | null
  destino_confirmacao?: RemocaoDestinoConfirmacao | null
  gps_posicoes_recent?: RemocaoGpsPosicao[]
  rota?: { origem_lat: number; origem_lng: number; destino_lat: number; destino_lng: number } | null
}
