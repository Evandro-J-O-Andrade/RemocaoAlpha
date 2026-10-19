import { describe, it, expect } from 'vitest'
import { StatusMachine } from '@/modules/remocao/services/statusMachine'
import { STATUS_CONFIG } from '@/modules/remocao/alerts/statusConfig'

describe('StatusMachine', () => {
  describe('canTransition', () => {
    it('allows valid forward transitions', () => {
      expect(StatusMachine.canTransition('SOLICITADA', 'EM_AVALIACAO')).toBe(true)
      expect(StatusMachine.canTransition('EM_AVALIACAO', 'AGUARDANDO_DESTINO')).toBe(true)
      expect(StatusMachine.canTransition('AGUARDANDO_DESTINO', 'DESTINO_CONFIRMADO')).toBe(true)
      expect(StatusMachine.canTransition('DESTINO_CONFIRMADO', 'AGUARDANDO_EQUIPE')).toBe(true)
      expect(StatusMachine.canTransition('AGUARDANDO_EQUIPE', 'EQUIPE_CONFIRMADA')).toBe(true)
      expect(StatusMachine.canTransition('EQUIPE_CONFIRMADA', 'AGUARDANDO_MOTORISTA')).toBe(true)
      expect(StatusMachine.canTransition('AGUARDANDO_MOTORISTA', 'MOTORISTA_CHECKIN')).toBe(true)
      expect(StatusMachine.canTransition('MOTORISTA_CHECKIN', 'MOTORISTA_CONFIRMADO')).toBe(true)
      expect(StatusMachine.canTransition('MOTORISTA_CONFIRMADO', 'CHECKLIST_PENDENTE')).toBe(true)
      expect(StatusMachine.canTransition('CHECKLIST_PENDENTE', 'PRONTA_PARA_SAIDA')).toBe(true)
      expect(StatusMachine.canTransition('PRONTA_PARA_SAIDA', 'EM_DESLOCAMENTO')).toBe(true)
      expect(StatusMachine.canTransition('EM_DESLOCAMENTO', 'CHEGADA_DESTINO')).toBe(true)
      expect(StatusMachine.canTransition('CHEGADA_DESTINO', 'PACIENTE_ENTREGUE')).toBe(true)
      expect(StatusMachine.canTransition('PACIENTE_ENTREGUE', 'RETORNANDO')).toBe(true)
      expect(StatusMachine.canTransition('RETORNANDO', 'RETORNOU_UNIDADE')).toBe(true)
      expect(StatusMachine.canTransition('RETORNOU_UNIDADE', 'ENCERRADA')).toBe(true)
    })

    it('disallows invalid transitions', () => {
      expect(StatusMachine.canTransition('EM_DESLOCAMENTO', 'SOLICITADA')).toBe(false)
      expect(StatusMachine.canTransition('ENCERRADA', 'EM_DESLOCAMENTO')).toBe(false)
      expect(StatusMachine.canTransition('CHEGADA_DESTINO', 'SOLICITADA')).toBe(false)
      expect(StatusMachine.canTransition('PACIENTE_ENTREGUE', 'AGUARDANDO_MOTORISTA')).toBe(false)
    })

    it('allows cancellation from non-terminal states', () => {
      expect(StatusMachine.canTransition('SOLICITADA', 'CANCELADA')).toBe(true)
      expect(StatusMachine.canTransition('EM_AVALIACAO', 'CANCELADA')).toBe(true)
      expect(StatusMachine.canTransition('AGUARDANDO_DESTINO', 'CANCELADA')).toBe(true)
    })

    it('blocks cancellation from terminal states', () => {
      expect(StatusMachine.canTransition('ENCERRADA', 'CANCELADA')).toBe(false)
      expect(StatusMachine.canTransition('CANCELADA', 'CANCELADA')).toBe(true)
    })

    it('allows suspension from non-terminal states', () => {
      expect(StatusMachine.canTransition('SOLICITADA', 'SUSPENSA')).toBe(true)
      expect(StatusMachine.canTransition('EM_AVALIACAO', 'SUSPENSA')).toBe(true)
      expect(StatusMachine.canTransition('AGUARDANDO_MOTORISTA', 'SUSPENSA')).toBe(true)
    })

    it('blocks suspension from terminal states', () => {
      expect(StatusMachine.canTransition('ENCERRADA', 'SUSPENSA')).toBe(false)
      expect(StatusMachine.canTransition('CANCELADA', 'SUSPENSA')).toBe(false)
    })

    it('returns true when from and to are the same', () => {
      expect(StatusMachine.canTransition('SOLICITADA', 'SOLICITADA')).toBe(true)
      expect(StatusMachine.canTransition('ENCERRADA', 'ENCERRADA')).toBe(true)
    })
  })

  describe('getValidTransitions', () => {
    it('returns valid next states for a status', () => {
      const transitions = StatusMachine.getValidTransitions('SOLICITADA')
      expect(transitions).toContain('EM_AVALIACAO')
      expect(transitions).toContain('CANCELADA')
      expect(transitions).toContain('SUSPENSA')
    })

    it('returns empty array for terminal states', () => {
      expect(StatusMachine.getValidTransitions('ENCERRADA')).toEqual([])
      expect(StatusMachine.getValidTransitions('CANCELADA')).toEqual([])
    })
  })

  describe('isTerminal', () => {
    it('identifies terminal states', () => {
      expect(StatusMachine.isTerminal('ENCERRADA')).toBe(true)
      expect(StatusMachine.isTerminal('CANCELADA')).toBe(true)
    })

    it('identifies non-terminal states', () => {
      expect(StatusMachine.isTerminal('SOLICITADA')).toBe(false)
      expect(StatusMachine.isTerminal('EM_DESLOCAMENTO')).toBe(false)
    })
  })

  describe('isCritical', () => {
    it('identifies critical statuses', () => {
      expect(StatusMachine.isCritical('EM_DESLOCAMENTO')).toBe(true)
      expect(StatusMachine.isCritical('INTERCORRENCIA')).toBe(true)
    })

    it('identifies non-critical statuses', () => {
      expect(StatusMachine.isCritical('SOLICITADA')).toBe(false)
      expect(StatusMachine.isCritical('ENCERRADA')).toBe(false)
    })
  })

  describe('isInProgress', () => {
    it('identifies in-progress statuses', () => {
      expect(StatusMachine.isInProgress('EM_DESLOCAMENTO')).toBe(true)
      expect(StatusMachine.isInProgress('CHEGADA_DESTINO')).toBe(true)
      expect(StatusMachine.isInProgress('PACIENTE_ENTREGUE')).toBe(true)
      expect(StatusMachine.isInProgress('RETORNANDO')).toBe(true)
      expect(StatusMachine.isInProgress('RETORNOU_UNIDADE')).toBe(true)
    })

    it('identifies non-in-progress statuses', () => {
      expect(StatusMachine.isInProgress('SOLICITADA')).toBe(false)
      expect(StatusMachine.isInProgress('ENCERRADA')).toBe(false)
    })
  })

  describe('isCancelled', () => {
    it('identifies cancelled statuses', () => {
      expect(StatusMachine.isCancelled('CANCELADA')).toBe(true)
      expect(StatusMachine.isCancelled('SUSPENSA')).toBe(true)
      expect(StatusMachine.isCancelled('NAO_REALIZADA')).toBe(true)
    })

    it('identifies non-cancelled statuses', () => {
      expect(StatusMachine.isCancelled('ENCERRADA')).toBe(false)
      expect(StatusMachine.isCancelled('EM_DESLOCAMENTO')).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('returns the config for a given status', () => {
      const config = StatusMachine.getConfig('EM_DESLOCAMENTO')
      expect(config.label).toBe('Em Deslocamento')
      expect(config.critical).toBe(true)
    })
  })

  describe('getAlertColor', () => {
    it('returns correct color for critical statuses', () => {
      expect(StatusMachine.getAlertColor('INTERCORRENCIA')).toBe('red')
    })

    it('returns correct color for scheduled statuses', () => {
      expect(StatusMachine.getAlertColor('SOLICITADA')).toBe('yellow')
    })

    it('returns correct color for delivered statuses', () => {
      expect(StatusMachine.getAlertColor('ENCERRADA')).toBe('green')
    })

    it('returns correct color for cancelled statuses', () => {
      expect(StatusMachine.getAlertColor('CANCELADA')).toBe('gray')
    })

    it('returns gray for unknown configs', () => {
      const originalConfig = STATUS_CONFIG.SOLICITADA
      const testConfig = { ...originalConfig, color: 'unknown-color' }
      STATUS_CONFIG.SOLICITADA = testConfig
      expect(StatusMachine.getAlertColor('SOLICITADA')).toBe('gray')
      STATUS_CONFIG.SOLICITADA = originalConfig
    })
  })
})
