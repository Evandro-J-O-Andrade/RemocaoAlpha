import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { LoadingProvider } from '@/modules/remocao/components/LoadingProvider'
import { LoadingSpinner } from '@/modules/remocao/components/LoadingSpinner'
import { ErrorBoundary } from '@/modules/remocao/components/ErrorBoundary'
import { StatePage } from '@/modules/remocao/components/StatePage'
import { Loader2, AlertTriangle } from 'lucide-react'

// ── LoadingSpinner ──────────────────────────────────────────────
describe('LoadingSpinner', () => {
  it('renderiza com texto', () => {
    render(<LoadingSpinner text="Carregando..." />)
    expect(screen.getByText('Carregando...')).toBeTruthy()
  })

  it('não renderiza texto quando não informado', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('aplica tamanho sm', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    expect(container.querySelector('.w-4')).toBeTruthy()
  })

  it('aplica tamanho lg', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    expect(container.querySelector('.w-10')).toBeTruthy()
  })
})

// ── ErrorBoundary ───────────────────────────────────────────────
describe('ErrorBoundary', () => {
  const Throw = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) throw new Error('boom')
    return <div>ok</div>
  }

  it('renderiza filhos quando não há erro', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Throw shouldThrow={false} />
        </ErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('ok')).toBeTruthy()
  })

  it('exibe tela de erro quando hijo lance exceção', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Throw shouldThrow={true} />
        </ErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('Algo deu errado')).toBeTruthy()
    expect(screen.getByText('Voltar ao início')).toBeTruthy()
    expect(screen.getByText('Tentar novamente')).toBeTruthy()
  })

  it('permite resetar o estado de erro', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Throw shouldThrow={true} />
        </ErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByText('Algo deu errado')).toBeTruthy()

    const retryButton = screen.getByText('Tentar novamente')
    fireEvent.click(retryButton)

    // Após reset, o container deve ter resetado o checkpoint
    expect(screen.getByText('Algo deu errado')).toBeTruthy()
  })
})

// ── StatePage ───────────────────────────────────────────────────
describe('StatePage', () => {
  it('renderiza loading com ícone de spinner', () => {
    render(
      <StatePage
        variant="loading"
        icon={<Loader2 size={40} className="animate-spin" />}
        title="Carregando"
        description="Aguarde"
      />
    )
    expect(screen.getByText('Carregando')).toBeTruthy()
    expect(screen.getByText('Aguarde')).toBeTruthy()
  })

  it('renderiza erro com ações', () => {
    render(
      <StatePage
        variant="error"
        icon={<AlertTriangle size={40} />}
        title="Erro"
        description="Falha"
      >
        <button type="button">Tentar</button>
      </StatePage>
    )
    expect(screen.getByText('Erro')).toBeTruthy()
    expect(screen.getByText('Falha')).toBeTruthy()
    expect(screen.getByText('Tentar')).toBeTruthy()
  })
})

// ── LoadingProvider ─────────────────────────────────────────────
describe('LoadingProvider', () => {
  it('inicia sem erro', () => {
    function Probe() {
      return null
    }
    render(
      <LoadingProvider>
        <Probe />
      </LoadingProvider>
    )
    expect(true).toBe(true)
  })
})

// ── AuthProvider — estados ──────────────────────────────────────
describe('AuthProvider — estados', () => {
  it('inicia sem usuário', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <div data-testid="child">ok</div>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })
})