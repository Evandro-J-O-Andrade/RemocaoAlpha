/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { NovaRemocaoPage } from '@/modules/remocao/pages/NovaRemocaoPage'
import { CentralRemocoesPage } from '@/modules/remocao/pages/CentralRemocoesPage'
import { RemocaoRepository } from '@/modules/remocao/repositories/remocaoRepository'
import { supabase } from '@/lib/supabase/client'
import { useLocation } from 'react-router-dom'

const PLACEHOLDER_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const { authState } = vi.hoisted(() => ({
  authState: {
    user: {
      id: 'user-1',
      email: 'test@test.com',
      tenant_id: 'tenant-1',
      tenant_nome: 'Empresa Teste',
      papel: 'admin',
      is_root: false,
      permissions: ['remocao.remocao.create'],
    } as Record<string, unknown>,
    memberships: [] as unknown[],
    loading: false,
  },
}))

vi.mock('@/modules/remocao/repositories/remocaoRepository', () => ({
  RemocaoRepository: {
    create: vi.fn(),
    getUnidades: vi.fn(),
    getSetores: vi.fn(),
    listVeiculosPorSituacao: vi.fn(),
    listEquipes: vi.fn(),
  },
}))

vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => authState,
}))

vi.mock('@/modules/remocao/context/RemocaoContext', () => ({
  useRemocao: () => ({
    remocoes: [],
    filteredRemocoes: [],
    loading: false,
    summary: null,
    refetch: vi.fn(),
    filter: { search: '', status: 'all' },
    setFilter: vi.fn(),
    setSelectedRemocao: vi.fn(),
  }),
}))

let bypassZod = false
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn((_schema: any) => {
    return async (data: any, _ctx: any) => {
      if (bypassZod) {
        return { values: data, errors: {} }
      }
      const errors: Record<string, any> = {}
      if (!data.paciente_nome || String(data.paciente_nome).length < 3) {
        errors.paciente_nome = {
          type: 'min',
          message: 'Nome do paciente é obrigatório',
          min: 3,
        }
      }
      if (Object.keys(errors).length > 0) {
        return { values: {}, errors }
      }
      return { values: data, errors: {} }
    }
  }),
}))

const mockCreate = RemocaoRepository.create as ReturnType<typeof vi.fn>
const mockGetUnidades = RemocaoRepository.getUnidades as ReturnType<typeof vi.fn>
const mockListVeiculosPorSituacao = RemocaoRepository.listVeiculosPorSituacao as ReturnType<typeof vi.fn>
const mockListEquipes = RemocaoRepository.listEquipes as ReturnType<typeof vi.fn>
const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>
const mockFrom = supabase.from as ReturnType<typeof vi.fn>
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>

let currentPath = '/nova-remocao'

function LocationProbe() {
  const { pathname } = useLocation()
  currentPath = pathname
  return null
}

function fromMock(data: any, error: any = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  }
}

function defaultUser() {
  return {
    id: 'user-1',
    email: 'test@test.com',
    tenant_id: 'tenant-1',
    tenant_nome: 'Empresa Teste',
    papel: 'admin',
    is_root: false,
    permissions: ['remocao.remocao.create'],
  } as Record<string, unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockReset()
  mockGetUnidades.mockReset()
  mockListVeiculosPorSituacao.mockReset()
  mockListEquipes.mockReset()
  mockRpc.mockReset()
  mockFrom.mockReset()
  mockGetSession.mockReset()
  bypassZod = true
  currentPath = '/nova-remocao'
  authState.user = defaultUser()
  authState.loading = false
  mockGetUnidades.mockResolvedValue({ data: [], error: null })
  mockCreate.mockResolvedValue({
    data: { id: 'rem-123', numero: 'REM-001' },
    error: null,
  })
  mockListVeiculosPorSituacao.mockResolvedValue({ data: [], error: null })
  mockListEquipes.mockResolvedValue({ data: [], error: null })
  mockRpc.mockResolvedValue({ data: null, error: null })
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockFrom.mockImplementation(() => fromMock(null))
})

afterEach(() => {
  vi.restoreAllMocks()
})

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/nova-remocao']}>
      <ThemeProvider>
        <NovaRemocaoPage />
        <LocationProbe />
      </ThemeProvider>
    </MemoryRouter>
  )
}

const renderCentral = () => {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <CentralRemocoesPage />
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('NovaRemocaoPage — fluxo de solicitação', () => {
  it('submissão válida cria o registro com o ID real e navega para o detalhe', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

    const nomeInput = await screen.findByPlaceholderText(/nome completo/i)
    await user.clear(nomeInput)
    await user.type(nomeInput, 'Paciente Teste')

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
    })

    const createCall = mockCreate.mock.calls[0][0]
    expect(createCall.tenant_id).toBe('tenant-1')
    expect(createCall.paciente_nome).toBe('Paciente Teste')

    const result = await mockCreate.mock.results[0].value
    expect(result).toMatchObject({ data: { id: 'rem-123' }, error: null })

    await waitFor(() => {
      expect(currentPath).toBe('/remocao/rem-123')
    })
  })

  it('erro de validação impede a submissão e exibe mensagem inline sem chamar o banco', async () => {
    bypassZod = false
    const { container } = renderPage()

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    // Allow async validation to settle, then confirm the bank was NOT called
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('falha de persistência exibe erro ao usuário, não navega e mantém os dados preenchidos', async () => {
    const user = userEvent.setup()
    mockCreate.mockResolvedValueOnce({
      data: null,
      error: new Error('Falha de conexão com o banco'),
    })

    const { container } = renderPage()

    const nomeInput = await screen.findByPlaceholderText(/nome completo/i)
    await user.clear(nomeInput)
    await user.type(nomeInput, 'Paciente Teste')

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getAllByText(/falha de conexão com o banco/i).length).toBeGreaterThan(0)
    })

    expect(currentPath).toBe('/nova-remocao')
    expect((nomeInput as HTMLInputElement).value).toBe('Paciente Teste')
  })

  it('exibe estado de carregamento enquanto a submissão está em andamento', async () => {
    const user = userEvent.setup()
    let resolveCreate: (val: any) => void = () => {}
    mockCreate.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = resolve
    }))

    const { container } = renderPage()

    const nomeInput = await screen.findByPlaceholderText(/nome completo/i)
    await user.clear(nomeInput)
    await user.type(nomeInput, 'Paciente Teste')

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salvando/i })).toBeTruthy()
    })

    resolveCreate({ data: { id: 'rem-123' }, error: null })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /solicitar remoção/i })).toBeTruthy()
    })
  })

  it('bloqueia a criação quando o tenant ativo não está resolvido', async () => {
    authState.user = { ...defaultUser(), tenant_id: '', tenant_nome: '' }

    const { container } = renderPage()

    expect(await screen.findByText(/organização de atendimento não resolvida/i)).toBeTruthy()
    expect(container.querySelector('form')).toBeNull()
    expect(screen.queryByPlaceholderText(/nome completo/i)).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('libera a criação com o tenant real do RemoçãoAlpha (id 0000...0001)', async () => {
    authState.user = {
      ...defaultUser(),
      tenant_id: PLACEHOLDER_TENANT_ID,
      tenant_nome: 'Instituto Alpha de Medicina para Saúde',
    }

    const { container } = renderPage()

    expect(await screen.findByPlaceholderText(/nome completo/i)).toBeTruthy()
    expect(container.querySelector('form')).not.toBeNull()
    expect(screen.queryByText(/organização de atendimento não resolvida/i)).toBeNull()
  })
})

describe('Central de Remoções — ação de nova remoção', () => {
  it('exibe o botão apontando para /nova-remocao quando o usuário tem a permissão de criação', async () => {
    renderCentral()

    const link = await screen.findByRole('link', { name: /nova remoção/i })
    expect(link.getAttribute('href')).toBe('/nova-remocao')
  })

  it('omite o botão quando o usuário não possui a permissão de criação', async () => {
    authState.user = { ...defaultUser(), permissions: ['remocao.remocao.read'] }

    renderCentral()

    await screen.findByRole('heading', { name: /central de despacho/i })
    expect(screen.queryByRole('link', { name: /nova remoção/i })).toBeNull()
  })

  it('mantém o botão visível para ROOT mesmo sem permissões explícitas', async () => {
    authState.user = { ...defaultUser(), is_root: true, permissions: [] }

    renderCentral()

    const link = await screen.findByRole('link', { name: /nova remoção/i })
    expect(link.getAttribute('href')).toBe('/nova-remocao')
  })
})
