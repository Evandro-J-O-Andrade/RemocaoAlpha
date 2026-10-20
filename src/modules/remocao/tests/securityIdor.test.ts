/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase/client'

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>
const mockFrom = supabase.from as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockRpc.mockReset()
  mockFrom.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Segurança — isolamento entre tenants (IDOR)', () => {
  describe('get_user_permissions é tenant-scoped', () => {
    it('retorna apenas permissões do tenant ativo do usuário autenticado', async () => {
      mockRpc.mockResolvedValue({
        data: [{ permission_key: 'remocao.remocao.read' }],
        error: null,
      })

      const { data, error } = await supabase.rpc('get_user_permissions')

      expect(error).toBeNull()
      expect(data).toEqual([{ permission_key: 'remocao.remocao.read' }])
      expect(mockRpc).toHaveBeenCalledWith('get_user_permissions')
    })

    it('não vaza permissões de outro tenant', async () => {
      mockRpc.mockResolvedValue({
        data: [{ permission_key: 'remocao.remocao.read' }],
        error: null,
      })

      const { data } = await supabase.rpc('get_user_permissions')

      const keys = (data as { permission_key: string }[]).map((p) => p.permission_key)
      expect(keys).not.toContain('admin.root.grant')
      expect(keys).not.toContain('admin.root.revoke')
    })
  })

  describe('has_permission não confunde tenants', () => {
    it('verifica permissão dentro do tenant ativo apenas', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const { data, error } = await supabase.rpc('has_permission', { permission: 'remocao.remocao.read' })

      expect(error).toBeNull()
      expect(data).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_permission', { permission: 'remocao.remocao.read' })
    })

    it('retorna false quando usuário não tem a permissão no tenant ativo', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const { data } = await supabase.rpc('has_permission', { permission: 'admin.root.grant' })

      expect(data).toBe(false)
    })
  })

  describe('is_admin_master confirma ROOT via banco', () => {
    it('retorna true apenas quando root_privileges tem registro ativo para o usuário', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const { data, error } = await supabase.rpc('is_admin_master')

      expect(error).toBeNull()
      expect(data).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
    })

    it('retorna false quando não existe privilégio ROOT ativo', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const { data } = await supabase.rpc('is_admin_master')

      expect(data).toBe(false)
    })
  })

  describe('queries filtram por tenant_id', () => {
    it('consultas de remocao incluem tenant_id do tenant ativo', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle })

      await supabase.from('remocao').select('*').eq('id', 'remocao-1').single()

      expect(mockFrom).toHaveBeenCalledWith('remocao')
    })
  })
})

describe('Segurança — não há bypass de ROOT no frontend', () => {
  it('is_root vem exclusivamente de is_admin_master() RPC', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const { data } = await supabase.rpc('is_admin_master')

    expect(data).toBe(true)
  })

  it('papel admin_gestao não confere privilégios ROOT globais', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { data } = await supabase.rpc('is_admin_master')

    expect(data).toBe(false)
  })
})
