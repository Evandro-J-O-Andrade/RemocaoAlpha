import type { StatusRemocao } from '@/modules/remocao/types'
import { STATUS_CONFIG, getStatusConfig } from '@/modules/remocao/alerts/statusConfig'

export class StatusMachine {
  private static transitions = STATUS_CONFIG

  static canTransition(from: StatusRemocao, to: StatusRemocao): boolean {
    if (from === to) return true

    const config = this.transitions[from]
    if (!config) return false

    // Cancelamento, suspensão, and intercorrência can happen from any non-terminal state
    if (to === 'CANCELADA' || to === 'SUSPENSA') {
      return !['ENCERRADA', 'CANCELADA'].includes(from)
    }
    if (to === 'INTERCORRENCIA') {
      return !['ENCERRADA', 'CANCELADA', 'SUSPENSA', 'RETORNOU_UNIDADE'].includes(from)
    }
    if (to === 'NAO_REALIZADA') {
      return !['ENCERRADA', 'CANCELADA', 'SUSPENSA'].includes(from)
    }

    return config.nextStates.includes(to)
  }

  static getValidTransitions(from: StatusRemocao): StatusRemocao[] {
    return this.transitions[from]?.nextStates || []
  }

  static isTerminal(status: StatusRemocao): boolean {
    return ['ENCERRADA', 'CANCELADA'].includes(status)
  }

  static isCritical(status: StatusRemocao): boolean {
    return getStatusConfig(status).critical
  }

  static isInProgress(status: StatusRemocao): boolean {
    return ['EM_DESLOCAMENTO', 'CHEGADA_DESTINO', 'PACIENTE_ENTREGUE', 'RETORNANDO', 'RETORNOU_UNIDADE'].includes(status)
  }

  static isCancelled(status: StatusRemocao): boolean {
    return ['CANCELADA', 'SUSPENSA', 'NAO_REALIZADA'].includes(status)
  }

  static getConfig(status: StatusRemocao) {
    return getStatusConfig(status)
  }

  static getAlertColor(status: StatusRemocao): string {
    const config = getStatusConfig(status)
    const colorMap: Record<string, string> = {
      scheduled: 'yellow',
      info: 'blue',
      'waiting-team': 'orange',
      'waiting-driver': 'pink',
      critical: 'red',
      'in-transit': 'blue',
      delivered: 'green',
      cancelled: 'gray',
    }
    return colorMap[config.color] || 'gray'
  }
}
