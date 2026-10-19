import { describe, it, expect } from 'vitest'
import { SafetyGuard } from '@/modules/remocao/services/remocaoService'
import type { Remocao, RemocaoChecklist } from '@/modules/remocao/types'

const baseRemocao: Remocao = {
  id: '123',
  numero: 'REM-001',
  tenant_id: 'tenant-1',
  paciente_nome: 'João Silva',
  finalidade: 'exame',
  status: 'SOLICITADA',
  prioridade: 'rotina',
  necessidade_medica: 'nao_necessario',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function checklistItem(overrides: Partial<RemocaoChecklist> = {}): RemocaoChecklist {
  return {
    id: 'c1',
    remocao_id: '123',
    secao: 'identificacao',
    item_key: 'item1',
    item_label: 'Item 1',
    checked: true,
    observacoes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('SafetyGuard', () => {
  const emptyChecklist: RemocaoChecklist[] = []

  describe('checkAll', () => {
    it('passes all checks with a valid remocao', () => {
      const remocao = {
        ...baseRemocao,
        status: 'ENCERRADA' as const,
        entrega_at: new Date().toISOString(),
        veiculo_id: 'v1',
        destino_confirmed_at: new Date().toISOString(),
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when paciente has no identification', () => {
      const remocao = { ...baseRemocao, paciente_nome: '' }
      const result = SafetyGuard.checkAll(remocao as any, emptyChecklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Paciente sem identificação')
    })

    it('fails when destino not confirmed for transferencia', () => {
      const remocao = {
        ...baseRemocao,
        finalidade: 'transferencia_inter_hospitalar' as const,
        destino_confirmed_at: null,
      }
      const result = SafetyGuard.checkAll(remocao as any, emptyChecklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Destino não confirmado em transferência')
    })

    it('passes when destino confirmed for transferencia', () => {
      const remocao = {
        ...baseRemocao,
        finalidade: 'transferencia_inter_hospitalar' as const,
        destino_confirmed_at: new Date().toISOString(),
        veiculo_id: 'v1',
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })

    it('fails when avancado support requires medico but team has none', () => {
      const remocao = {
        ...baseRemocao,
        nivel_suporte: 'avancado',
        equipe_has_medico: false,
        veiculo_id: 'v1',
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Equipe não tem médico para suporte avançado')
    })

    it('passes when avancado support has medico', () => {
      const remocao = {
        ...baseRemocao,
        nivel_suporte: 'avancado',
        equipe_has_medico: true,
        veiculo_id: 'v1',
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })

    it('fails when veiculo not assigned', () => {
      const remocao = { ...baseRemocao, veiculo_id: null }
      const result = SafetyGuard.checkAll(remocao as any, emptyChecklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Veículo não atribuído')
    })

    it('fails when checklist is incomplete', () => {
      const remocao = { ...baseRemocao, veiculo_id: 'v1' }
      const checklist = [checklistItem({ checked: false })]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Checklist incompleto')
    })

    it('passes when checklist is complete', () => {
      const remocao = { ...baseRemocao, veiculo_id: 'v1' }
      const checklist = [checklistItem(), checklistItem({ id: 'c2', item_key: 'item2' })]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })

    it('fails when checklist is empty', () => {
      const remocao = { ...baseRemocao, veiculo_id: 'v1' }
      const result = SafetyGuard.checkAll(remocao as any, [])
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Checklist incompleto')
    })

    it('fails when checkout without liberacao', () => {
      const remocao = {
        ...baseRemocao,
        veiculo_id: 'v1',
        checkout_at: new Date().toISOString(),
        liberacao_por: null,
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Saída sem liberação')
    })

    it('passes when checkout has liberacao', () => {
      const remocao = {
        ...baseRemocao,
        veiculo_id: 'v1',
        checkout_at: new Date().toISOString(),
        liberacao_por: 'user-1',
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })

    it('fails when checkout without checkin', () => {
      const remocao = {
        ...baseRemocao,
        veiculo_id: 'v1',
        checkout_motorista_at: new Date().toISOString(),
        checkin_at: null,
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Checkout sem check-in')
    })

    it('passes when checkout has checkin', () => {
      const remocao = {
        ...baseRemocao,
        veiculo_id: 'v1',
        checkout_motorista_at: new Date().toISOString(),
        checkin_at: new Date().toISOString(),
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })

    it('fails when ENCERRADA without patient delivery', () => {
      const remocao = {
        ...baseRemocao,
        status: 'ENCERRADA' as const,
        veiculo_id: 'v1',
        entrega_at: null,
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(false)
      expect(result.errors).toContain('Encerramento sem entrega do paciente')
    })

    it('passes when ENCERRADA with patient delivery', () => {
      const remocao = {
        ...baseRemocao,
        status: 'ENCERRADA' as const,
        veiculo_id: 'v1',
        entrega_at: new Date().toISOString(),
      }
      const checklist = [checklistItem()]
      const result = SafetyGuard.checkAll(remocao as any, checklist)
      expect(result.ok).toBe(true)
    })
  })

  describe('canTransition', () => {
    it('allows valid transition', () => {
      const remocao = { ...baseRemocao, status: 'SOLICITADA' as const }
      const result = SafetyGuard.canTransition(remocao as any, 'EM_AVALIACAO')
      expect(result.ok).toBe(true)
    })

    it('blocks invalid transition', () => {
      const remocao = { ...baseRemocao, status: 'ENCERRADA' as const }
      const result = SafetyGuard.canTransition(remocao as any, 'EM_DESLOCAMENTO')
      expect(result.ok).toBe(false)
      expect(result.reason).toContain('Transição inválida')
    })
  })
})
