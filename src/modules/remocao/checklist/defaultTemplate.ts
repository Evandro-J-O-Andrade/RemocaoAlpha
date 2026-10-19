import { supabase } from '@/lib/supabase/client'
import type { RemocaoChecklist, ChecklistSecao } from '@/modules/remocao/types'

export interface DefaultChecklistItem {
  secao: ChecklistSecao
  item_key: string
  item_label: string
  required: boolean
  tipos_aplicaveis: string[]
}

export const DEFAULT_CHECKLIST: DefaultChecklistItem[] = [
  { secao: 'identificacao', item_key: 'paciente_identidade', item_label: 'Identidade do paciente conferida', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'identificacao', item_key: 'paciente_pulseira', item_label: 'Pulseira conferida', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'identificacao', item_key: 'paciente_prontuario', item_label: 'Prontuário conferido', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'identificacao', item_key: 'destino_confirmado', item_label: 'Destino confirmado', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'sinais_vitais', item_label: 'Sinais vitais avaliados', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'condicao_transporte', item_label: 'Condição clínica compatível com transporte', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'oxigenio', item_label: 'Oxigênio conferido', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'acesso_venoso', item_label: 'Acesso venoso conferido', required: true, tipos_aplicaveis: ['intermediario', 'avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'medicacoes', item_label: 'Medicações conferidas', required: true, tipos_aplicaveis: ['avancado', 'urgente'] },
  { secao: 'condicao_clinica', item_key: 'equipamentos', item_label: 'Equipamentos necessários disponíveis', required: true, tipos_aplicaveis: ['intermediario', 'avancado', 'urgente'] },
  { secao: 'documentacao', item_key: 'relatorio_medico', item_label: 'Relatório médico', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'documentacao', item_key: 'pedido_exame', item_label: 'Pedido de exame/procedimento', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'documentacao', item_key: 'documento_transferencia', item_label: 'Documento de transferência', required: true, tipos_aplicaveis: ['intermediario', 'avancado'] },
  { secao: 'documentacao', item_key: 'autorizacao', item_label: 'Autorização, quando aplicável', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado'] },
  { secao: 'documentacao', item_key: 'docs_administrativos', item_label: 'Documentos administrativos', required: false, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'veiculo', item_key: 'veiculo_disponivel', item_label: 'Veículo disponível', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'veiculo', item_key: 'veiculo_adquado', item_label: 'Veículo adequado ao paciente', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'veiculo', item_key: 'equipamentos_veiculo', item_label: 'Equipamentos conferidos', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'veiculo', item_key: 'oxigenio_veiculo', item_label: 'Oxigênio conferido', required: true, tipos_aplicaveis: ['basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'veiculo', item_key: 'comunicacao', item_label: 'Comunicação disponível', required: true, tipos_aplicaveis: ['intermediario', 'avancado', 'urgente'] },
  { secao: 'equipe', item_key: 'motorista', item_label: 'Motorista confirmado', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'equipe', item_key: 'tecnico', item_label: 'Técnico confirmado', required: true, tipos_aplicaveis: ['simple', 'basico', 'intermediario', 'avancado', 'urgente'] },
  { secao: 'equipe', item_key: 'enfermeiro', item_label: 'Enfermeiro confirmado (quando necessário)', required: true, tipos_aplicaveis: ['intermediario', 'avancado', 'urgente'] },
  { secao: 'equipe', item_key: 'medico', item_label: 'Médico confirmado (quando necessário)', required: true, tipos_aplicaveis: ['avancado', 'urgente'] },
]

export async function generateChecklistForRemocao(
  remocaoId: string,
  tipoTransporte: string
): Promise<{ data: RemocaoChecklist[] | null; error: any }> {
  const applicableItems = DEFAULT_CHECKLIST.filter(
    (item) => item.tipos_aplicaveis.includes(tipoTransporte) || item.tipos_aplicaveis.includes('simple')
  )

  const itemsToInsert = applicableItems.map((item) => ({
    remocao_id: remocaoId,
    secao: item.secao,
    item_key: item.item_key,
    item_label: item.item_label,
    checked: false,
  }))

  if (itemsToInsert.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .from('remocao_checklist')
    .insert(itemsToInsert)
    .select()

  return { data: data as RemocaoChecklist[] | null, error }
}
