import { RemocaoRepository } from '@/modules/remocao/repositories/remocaoRepository'
import { StatusMachine } from '@/modules/remocao/services/statusMachine'
import type { StatusRemocao, Remocao, RemocaoChecklist } from '@/modules/remocao/types'

interface SafetyRemocao extends Remocao {
  equipe_has_medico?: boolean
}

// Safety guard validators (section 26)
export class SafetyGuard {
  static checkAll(remocao: SafetyRemocao, checklist: RemocaoChecklist[]): { ok: boolean; errors: string[] } {
    const errors: string[] = []

    // paciente sem identificação
    if (!remocao.paciente_nome) errors.push('Paciente sem identificação')

    // destino não confirmado em transferência
    if (
      remocao.finalidade === 'transferencia_inter_hospitalar' &&
      !remocao.destino_confirmed_at
    ) {
      errors.push('Destino não confirmado em transferência')
    }

    // equipe incompatível com classificação
    const nivelSuporte = remocao.nivel_suporte
    if (nivelSuporte === 'avancado' && !remocao.equipe_has_medico) {
      errors.push('Equipe não tem médico para suporte avançado')
    }

    // motorista não confirmado
    if (!remocao.veiculo_id) errors.push('Veículo não atribuído')

    // checklist incompleto
    const checklistComplete = checklist.length > 0 && checklist.every((c) => c.checked)
    if (!checklistComplete) errors.push('Checklist incompleto')

    // saída sem liberação
    if (remocao.checkout_at && !remocao.liberacao_por) {
      errors.push('Saída sem liberação')
    }

    // checkout sem check-in
    if (remocao.checkout_motorista_at && !remocao.checkin_at) {
      errors.push('Checkout sem check-in')
    }

    // encerramento sem entrega do paciente
    if (
      remocao.status === 'ENCERRADA' &&
      !remocao.entrega_at
    ) {
      errors.push('Encerramento sem entrega do paciente')
    }

    return { ok: errors.length === 0, errors }
  }

  static canTransition(remocao: SafetyRemocao, nextStatus: StatusRemocao): { ok: boolean; reason?: string } {
    if (!StatusMachine.canTransition(remocao.status, nextStatus)) {
      return { ok: false, reason: `Transição inválida: ${remocao.status} -> ${nextStatus}` }
    }
    return { ok: true }
  }
}

export class RemocaoService {
  static async solicitar(payload: any) {
    const result = await RemocaoRepository.create(payload)
    return result
  }

  static async transicionarStatus(
    remocaoId: string,
    novoStatus: StatusRemocao,
    usuarioId: string,
    tenantId: string,
    motivo?: string
  ) {
    const { data: remocao, error: fetchErr } = await RemocaoRepository.getById(remocaoId, tenantId)
    if (fetchErr || !remocao) return { data: null, error: fetchErr }

    const safety = SafetyGuard.canTransition(remocao, novoStatus)
    if (!safety.ok) {
      return { data: null, error: new Error(safety.reason) }
    }

    return RemocaoRepository.updateStatus(remocaoId, tenantId, novoStatus, usuarioId, motivo)
  }

  static async montarEquipe(
    remocaoId: string,
    tenantId: string,
    membros: { profissional_id: string; profissional_nome: string; role: string; profissional_cargo?: string }[]
  ) {
    const result = await RemocaoRepository.montarEquipe(remocaoId, tenantId, membros)

    if (result.data && !result.error) {
      await RemocaoRepository.update(remocaoId, tenantId, {
        updated_at: new Date().toISOString(),
      })
    }
    return result
  }

  static async escalarVeiculo(remocaoId: string, tenantId: string, veiculoId: string) {
    return RemocaoRepository.escalarVeiculo(remocaoId, tenantId, veiculoId)
  }

  static async registrarCheckin(remocaoId: string, payload: any) {
    return RemocaoRepository.createCheckin({ remocao_id: remocaoId, ...payload })
  }

  static async registrarCheckout(remocaoId: string, payload: any) {
    const result = await RemocaoRepository.createCheckout({
      remocao_id: remocaoId,
      ...payload,
      created_at: new Date().toISOString(),
    })

    if (result.data && !result.error) {
      await RemocaoRepository.finalizarCheckout?.(remocaoId, payload.quilometragem_inicial, payload.quilometragem_final)
    }
    return result
  }

  static async registrarIntercorrencia(payload: any) {
    const result = await RemocaoRepository.createIntercorrencia({ ...payload })

    if (result.data && !result.error) {
      await RemocaoRepository.createEvento({
        remocao_id: payload.remocao_id,
        evento: 'intercorrencia_registrada',
        descricao: `Intercorrência: ${payload.tipo}`,
        nivel: 'critical',
        dados: { intercorrencia_id: result.data.id },
        criado_por_nome: payload.profissional_nome,
      })
    }
    return result
  }

  static async uploadDocumento(remocaoId: string, tenantId: string, file: File, tipo: string, titulo: string) {
    return RemocaoRepository.uploadDocumento(remocaoId, tenantId, file, tipo, titulo)
  }

  // GPS forwarding from driver app
  static async registrarGps(payload: any) {
    return RemocaoRepository.insertGpsPosicao({ ...payload })
  }
}
