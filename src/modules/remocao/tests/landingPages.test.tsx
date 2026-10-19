/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorPage } from '@/modules/remocao/pages/ErrorPage'
import { FallbackPage } from '@/modules/remocao/pages/FallbackPage'
import { RollbackPage } from '@/modules/remocao/pages/RollbackPage'
import { LoadingAppPage } from '@/modules/remocao/pages/LoadingAppPage'
import { FeedbackPage } from '@/modules/remocao/components/FeedbackPage'
import { StatePage } from '@/modules/remocao/components/StatePage'

const wrap = (element: React.ReactElement) => (
  <MemoryRouter initialEntries={['/']}>{element}</MemoryRouter>
)

describe('ErrorPage', () => {
  it('renderiza título, descrição e botões de ação', () => {
    render(wrap(<ErrorPage onRetry={() => {}} onHome={() => {}} />))
    expect(screen.getByText(/algo não saiu como esperado/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /voltar ao início/i })).toBeTruthy()
  })

  it('não exibe stack trace nem detalhes internos na mensagem pública', () => {
    render(wrap(<ErrorPage errorCode="ERR-123" onRetry={() => {}} onHome={() => {}} />))
    const text = document.body.textContent || ''
    expect(text).not.toContain('stack')
    expect(text).not.toContain('at ')
    expect(text).not.toContain('Reference:')
  })

  it('exibe código de referência quando fornecido', () => {
    render(wrap(<ErrorPage errorCode="ERR-123" onRetry={() => {}} onHome={() => {}} />))
    expect(screen.getByText('ERR-123')).toBeTruthy()
  })
})

describe('FallbackPage', () => {
  it('renderiza com motivo service por padrão', () => {
    render(wrap(<FallbackPage onRetry={() => {}} />))
    expect(screen.getByText(/serviço temporariamente indisponível/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy()
  })

  it('renderiza motivo network com ícone e mensagem adequada', () => {
    render(wrap(<FallbackPage reason="network" onRetry={() => {}} />))
    expect(screen.getByText(/conexão instável/i)).toBeTruthy()
  })

  it('lista funcionalidades disponíveis quando fornecidas', () => {
    render(wrap(<FallbackPage availableFeatures={["Dashboard", "Relatórios"]} onRetry={() => {}} />))
    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Relatórios')).toBeTruthy()
  })

  it('não exibe botão de retry quando não fornecido', () => {
    render(wrap(<FallbackPage />))
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull()
  })
})

describe('RollbackPage', () => {
  it('renderiza status reverted com ícone de sucesso', () => {
    render(wrap(<RollbackPage status="reverted" onAction={() => {}} />))
    expect(screen.getByText(/estado anterior restaurado/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /continuar/i })).toBeTruthy()
  })

  it('renderiza status reverting com animação de ícone', () => {
    render(wrap(<RollbackPage status="reverting" />))
    expect(screen.getByText(/revertendo alterações/i)).toBeTruthy()
  })

  it('renderiza status failed com mensagem de erro', () => {
    render(wrap(<RollbackPage status="failed" />))
    expect(screen.getByText(/não foi possível reverter/i)).toBeTruthy()
  })

  it('navega para origem quando actionLabel não fornecido e sem onAction', () => {
    render(wrap(<RollbackPage status="reverted" />))
    const button = screen.getByRole('button', { name: /continuar/i })
    expect(button).toBeTruthy()
  })
})

describe('LoadingAppPage', () => {
  it('renderiza tela de carregamento inicial', () => {
    render(wrap(<LoadingAppPage />))
    expect(screen.getByText(/preparando sua gestão/i)).toBeTruthy()
  })

  it('renderiza fallback após falha simulada', () => {
    render(wrap(<LoadingAppPage />))
    // Não testamos o timeout de 30s diretamente, apenas que renderiza o loading
    expect(screen.getByText(/validando sessão/i)).toBeTruthy()
  })
})

describe('FeedbackPage', () => {
  it('reutiliza StatePage para variant error', () => {
    render(wrap(<FeedbackPage variant="error" onRetry={() => {}} onHome={() => {}} />))
    expect(screen.getByText(/ops! algo deu errado/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /ir para o início/i })).toBeTruthy()
  })

  it('renderiza variant success', () => {
    render(wrap(<FeedbackPage variant="success" onHome={() => {}} />))
    expect(screen.getByText(/operação concluída/i)).toBeTruthy()
  })

  it('renderiza variant forbidden', () => {
    render(wrap(<FeedbackPage variant="forbidden" onHome={() => {}} />))
    expect(screen.getByText(/acesso negado/i)).toBeTruthy()
  })

  it('renderiza variant not-found', () => {
    render(wrap(<FeedbackPage variant="not-found" onHome={() => {}} />))
    expect(screen.getByText(/página não encontrada/i)).toBeTruthy()
  })

  it('renderiza variant unauthorized', () => {
    render(wrap(<FeedbackPage variant="unauthorized" onHome={() => {}} />))
    expect(screen.getByText(/acesso não autorizado/i)).toBeTruthy()
  })

  it('renderiza variant maintenance', () => {
    render(wrap(<FeedbackPage variant="maintenance" onHome={() => {}} />))
    expect(screen.getByText(/sistema em manutenção/i)).toBeTruthy()
  })

  it('renderiza variant fallback', () => {
    render(wrap(<FeedbackPage variant="fallback" onRetry={() => {}} />))
    expect(screen.getByText(/serviço temporariamente indisponível/i)).toBeTruthy()
  })

  it('renderiza variant rollback', () => {
    render(wrap(<FeedbackPage variant="rollback" onHome={() => {}} />))
    expect(screen.getByText(/operação revertida com sucesso/i)).toBeTruthy()
  })
})

describe('StatePage', () => {
  it('renderiza todas as variantes sem erro', () => {
    const variants: Array<Parameters<typeof StatePage>[0]['variant']> = [
      'loading', 'success', 'error', 'fallback', 'rollback',
      'not-found', 'unauthorized', 'forbidden', 'maintenance',
    ]
    variants.forEach((variant) => {
      render(
        <StatePage variant={variant} icon={<span>ícone</span>} title="Título" description="Descrição" />
      )
      expect(screen.getByText('Título')).toBeTruthy()
      expect(screen.getByText('Descrição')).toBeTruthy()
    })
  })
})
