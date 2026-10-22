/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { LoginPage } from '@/modules/remocao/pages/LoginPage'
import { supabase } from '@/lib/supabase/client'

// Login não depende de animação. Mockar Motion neste teste evita que happy-dom
// gere AbortError não tratado ao cancelar animações durante o unmount dos testes.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const motionProps = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileInView', 'viewport', 'layout', 'layoutId',
  ])
  const components = new Map<string, any>()
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!components.has(tag)) {
        const Component = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const domProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => !motionProps.has(key) && key !== 'children'),
          )
          return React.createElement(tag, { ...domProps, ref }, props.children as React.ReactNode)
        })
        components.set(tag, Component)
      }
      return components.get(tag)
    },
  })
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

const mockSignIn = supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>

let getSessionCallIndex = 0

const renderLogin = () => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <ThemeProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

const waitForLoginIdle = async () => {
  await waitFor(() => {
    const button = screen.getByRole('button', { name: /entrar no sistema/i })
    expect((button as HTMLButtonElement).disabled).toBe(false)
  })
}

const mockSuccessfulAuth = () => {
  getSessionCallIndex = 0
  mockSignIn.mockImplementation(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      }, 300)
    })
  })
  mockGetSession.mockImplementation(() => {
    getSessionCallIndex++
    if (getSessionCallIndex === 1) {
      return Promise.resolve({ data: { session: null }, error: null })
    }
    return Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
  })
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'get_current_tenant_info') {
      return Promise.resolve({
        data: [
          {
            tenant_id: 'tenant-1',
            tenant_nome: 'Empresa Teste',
            person_email: 'test@test.com',
            person_nome: 'Usuario Teste',
            papel: 'admin',
            is_root: false,
          },
        ],
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
}

const mockInvalidCredentials = () => {
  mockSignIn.mockResolvedValue({
    data: { session: null },
    error: { message: 'Invalid login credentials', status: 400 },
  })
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
}

const mockNetworkError = () => {
  mockSignIn.mockRejectedValue(new Error('Failed to fetch'))
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
}

const mockTimeoutError = () => {
  mockSignIn.mockRejectedValue(new Error('timeout'))
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
}

const mockServiceUnavailable = () => {
  mockSignIn.mockResolvedValue({
    data: { session: null },
    error: { message: 'Service unavailable', status: 503 },
  })
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSignIn.mockReset()
  mockGetSession.mockReset()
  mockRpc.mockReset()
  getSessionCallIndex = 0
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LoginPage — estados de autenticação (TDD)', () => {
  describe('Estado inicial (idle)', () => {
    it('começa com o botao Entrar disponivel e sem erro', async () => {
      renderLogin()
      await waitForLoginIdle()

      const button = screen.getByRole('button', { name: /entrar no sistema/i })
      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(screen.queryByTestId('login-error-inline')).toBeNull()
    })

    it('o AuthProvider inicia sem erro exposto', async () => {
      renderLogin()
      await waitForLoginIdle()

      expect(screen.queryByTestId('login-error-inline')).toBeNull()
      expect(screen.queryByTestId('login-feedback-error')).toBeNull()
    })
  })

  describe('Submissao (submitting)', () => {
    it('entra em authenticating ao submeter e exibe indicador de carregamento no botao', async () => {
      mockSuccessfulAuth()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect((button as HTMLButtonElement).disabled).toBe(true)
      })
    })

    it('bloqueia submissoes duplicadas enquanto autenticacao esta em andamento', async () => {
      mockSignIn.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
          }, 200)
        })
      })
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      mockRpc.mockResolvedValue({
        data: [{ tenant_id: 't1', tenant_nome: 'T', person_email: 'e@e.com', person_nome: 'N', papel: 'a', is_root: false }],
        error: null,
      })
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect((button as HTMLButtonElement).disabled).toBe(true)
      })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByTestId('login-error-inline')).toBeNull()
      })

      expect(mockSignIn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Erro: credenciais invalidas', () => {
    it('exibe span de erro inline associado ao formulario', async () => {
      mockInvalidCredentials()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorSpan = screen.getByTestId('login-error-inline')
      expect(errorSpan.getAttribute('role')).toBe('alert')
      const text = errorSpan.textContent || ''
      expect(text).toContain('inválidos')
      expect(text).not.toContain('stack')
      expect(text).not.toContain('token')
      expect(text).not.toContain('jwt')
    })

    it('encerra o loading e reabilita o botao apos credenciais invalidas', async () => {
      mockInvalidCredentials()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(button.textContent).toContain('Entrar no sistema')
    })
  })

  describe('Erro: rede, timeout e servico indisponível', () => {
    it('diferencia erro de rede de credenciais invalidas', async () => {
      mockNetworkError()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorSpan = screen.getByTestId('login-error-inline')
      const text = errorSpan.textContent || ''
      expect(text).toContain('conexão')
    })

    it('diferencia timeout de credenciais invalidas', async () => {
      mockTimeoutError()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorSpan = screen.getByTestId('login-error-inline')
      const text = errorSpan.textContent || ''
      expect(text).toContain('Tempo esgotado')
    })

    it('diferencia servico indisponivel de credenciais invalidas', async () => {
      mockServiceUnavailable()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorSpan = screen.getByTestId('login-error-inline')
      const text = errorSpan.textContent || ''
      expect(text).toContain('Serviço')
      expect(text).not.toContain('invalidos')
    })

    it('encerrado o loading apos erro de rede', async () => {
      mockNetworkError()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      expect((button as HTMLButtonElement).disabled).toBe(false)
      expect(button.textContent).toContain('Entrar no sistema')
    })
  })

  describe('Retry', () => {
    it('permite nova tentativa sem recarregar a pagina', async () => {
      mockInvalidCredentials()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      mockSuccessfulAuth()
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect((button as HTMLButtonElement).disabled).toBe(true)
      })

      expect(mockSignIn).toHaveBeenCalledTimes(2)
    })

    it('limpa o erro anterior ao iniciar nova tentativa', async () => {
      mockInvalidCredentials()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      mockSuccessfulAuth()
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByTestId('login-error-inline')).toBeNull()
      })
    })
  })

  describe('Sucesso', () => {
    it('autentica e encerra o loading apos sessao e identidade estarem resolvidas', async () => {
      mockSuccessfulAuth()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByTestId('login-error-inline')).toBeNull()
      })
      await waitFor(() => {
        expect(button.textContent).toContain('Entrar no sistema')
        expect((button as HTMLButtonElement).disabled).toBe(false)
      })
    })

    it('nao deixa estado de erro e sucesso ativos simultaneamente', async () => {
      mockSuccessfulAuth()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByTestId('login-error-inline')).toBeNull()
      })
      await waitFor(() => {
        expect(button.textContent).toContain('Entrar no sistema')
        expect((button as HTMLButtonElement).disabled).toBe(false)
      })

      expect(screen.queryByTestId('login-error-inline')).toBeNull()
    })
  })

  describe('Seguranca — nao expor detalhes internos', () => {
    it('nao exibe stack trace no erro inline', async () => {
      mockSignIn.mockRejectedValue(new Error('Something went wrong\nat AuthProvider.signIn (file.ts:10:5)\nat LoginPage.handleSubmit (file.tsx:25:10)'))
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorText = screen.getByTestId('login-error-inline').textContent || ''
      expect(errorText).not.toContain('at ')
      expect(errorText).not.toContain('file.ts')
      expect(errorText).not.toContain('stack')
    })

    it('nao exibe tokens ou credenciais no erro inline', async () => {
      mockInvalidCredentials()
      renderLogin()
      await waitForLoginIdle()

      const emailInput = screen.getByLabelText(/e-mail/i)
      const passwordInput = screen.getByLabelText(/senha/i)
      const button = screen.getByRole('button', { name: /entrar no sistema/i })

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
      fireEvent.change(passwordInput, { target: { value: 'senha123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('login-error-inline')).not.toBeNull()
      })

      const errorText = screen.getByTestId('login-error-inline').textContent || ''
      expect(errorText).not.toContain('test@test.com')
      expect(errorText).not.toContain('senha123')
      expect(errorText).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/)
    })
  })
})
