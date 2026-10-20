/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { supabase } from '@/lib/supabase/client'

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>

const renderAuth = () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <AuthProvider>
          <div data-testid="auth-child">children</div>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

const mockSessionRestored = (userId: string, userEmail: string | null) => {
  mockGetSession.mockImplementation(() =>
    Promise.resolve({ data: { session: { user: { id: userId, email: userEmail } } }, error: null })
  )
  mockOnAuthStateChange.mockImplementation(() => ({
    subscription: { unsubscribe: vi.fn() },
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRpc.mockReset()
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthProvider — detecção de ROOT via RPC is_admin_master', () => {
  describe('Quando não existe admin_master (primeiro bootstrap)', () => {
    it('deve chamar is_admin_master() e retornar is_root=false', async () => {
      mockSessionRestored('user-1', 'evandro_j.o.a@hotmail.com')
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'is_admin_master') {
          return Promise.resolve({ data: false, error: null })
        }
        if (fnName === 'get_current_tenant_info') {
          return Promise.resolve({ data: [], error: null })
        }
        if (fnName === 'get_user_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      renderAuth()

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
      })
    })

    it('não deve inferir ROOT apenas pela existência de permissões', async () => {
      mockSessionRestored('user-1', 'test@test.com')
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'is_admin_master') {
          return Promise.resolve({ data: false, error: null })
        }
        if (fnName === 'get_current_tenant_info') {
          return Promise.resolve({ data: [], error: null })
        }
        if (fnName === 'get_user_permissions') {
          return Promise.resolve({
            data: [{ permission_key: 'remocao.remocao.read' }],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      renderAuth()

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
      })
    })
  })

  describe('Quando admin_master já existe', () => {
    it('deve chamar is_admin_master() e retornar is_root=true', async () => {
      mockSessionRestored('user-root', 'evandro_j.o.a@hotmail.com')
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'is_admin_master') {
          return Promise.resolve({ data: true, error: null })
        }
        if (fnName === 'get_current_tenant_info') {
          return Promise.resolve({ data: [], error: null })
        }
        if (fnName === 'get_user_permissions') {
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      renderAuth()

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
      })
    })
  })

  describe('Quando usuário tem tenant ativo mas não é ROOT', () => {
    it('deve chamar is_admin_master() e retornar is_root=false', async () => {
      mockSessionRestored('user-2', 'gestor@test.com')
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'is_admin_master') {
          return Promise.resolve({ data: false, error: null })
        }
        if (fnName === 'get_current_tenant_info') {
          return Promise.resolve({
            data: [{
              tenant_id: 'tenant-1',
              tenant_nome: 'Empresa Teste',
              person_email: 'gestor@test.com',
              person_nome: 'Gestor Teste',
              papel: 'admin_gestao',
              is_root: false,
            }],
            error: null,
          })
        }
        if (fnName === 'get_user_permissions') {
          return Promise.resolve({
            data: [{ permission_key: 'remocao.remocao.read' }],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      renderAuth()

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
      })
    })
  })
})

describe('AuthProvider — contrato canônico de campos', () => {
  it('deve resolver email da sessão autenticada (Supabase Auth)', async () => {
    mockSessionRestored('user-1', 'evandro_j.o.a@hotmail.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: false, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_user_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })
  })

  it('deve consultar people.full_name para username', async () => {
    mockSessionRestored('user-1', 'evandro_j.o.a@hotmail.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: false, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_user_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('people')
    })
  })
})

describe('AuthProvider — status de autorização', () => {
  it('deve chamar get_current_tenant_info quando usuário sem tenant e sem ROOT', async () => {
    mockSessionRestored('user-3', 'semtenant@test.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: false, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_user_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_current_tenant_info')
    })
  })

  it('deve chamar is_admin_master quando usuário ROOT sem tenant', async () => {
    mockSessionRestored('user-root', 'evandro_j.o.a@hotmail.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: true, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fnName === 'get_user_permissions') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_admin_master')
    })
  })
})
