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

describe('AuthProvider — admin_gestao permissions (p.key format)', () => {
  it('deve carregar permissões quando RPC retorna p.key (formato real do banco)', async () => {
    mockSessionRestored('gestor-user', 'gestor@test.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: false, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({
          data: [{
            tenant_id: 'tenant-1',
            tenant_nome: 'Empresa Teste',
            person_id: 'gestor-user',
            person_nome: 'Gestor Teste',
            person_email: 'gestor@test.com',
            papel: 'admin_gestao',
            is_root: false,
          }],
          error: null,
        })
      }
      if (fnName === 'get_user_permissions') {
        // Formato real do RPC: strings (p.key::text)
        return Promise.resolve({
          data: [
            'remocao.remocao.read',
            'remocao.remocao.create',
            'remocao.dashboard.read',
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_user_permissions')
    })
  })

  it('deve carregar permissões quando RPC retorna objetos com key (formato Supabase)', async () => {
    mockSessionRestored('gestor-user-2', 'gestor2@test.com')
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'is_admin_master') {
        return Promise.resolve({ data: false, error: null })
      }
      if (fnName === 'get_current_tenant_info') {
        return Promise.resolve({
          data: [{
            tenant_id: 'tenant-1',
            tenant_nome: 'Empresa Teste',
            person_id: 'gestor-user-2',
            person_nome: 'Gestor Teste 2',
            person_email: 'gestor2@test.com',
            papel: 'admin_gestao',
            is_root: false,
          }],
          error: null,
        })
      }
      if (fnName === 'get_user_permissions') {
        // Formato Supabase: array de objetos com campo 'key'
        return Promise.resolve({
          data: [
            { key: 'remocao.remocao.read' },
            { key: 'remocao.remocao.create' },
            { key: 'remocao.dashboard.read' },
          ],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderAuth()

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_user_permissions')
    })
  })
})
