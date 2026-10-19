import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  checkpoint: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, checkpoint: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    this.props.onError?.(error, info)
  }

  handleReset = () => {
    this.setState((prev) => ({ hasError: false, error: null, checkpoint: prev.checkpoint + 1 }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Algo deu errado</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Nossa equipe foi notificada.
            </p>
          {this.state.error && (
            <details className="text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                <Bug className="mr-1 inline h-3 w-3" />
                Detalhes técnicos
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                Erro inesperado. Entre em contato com o suporte.
              </pre>
            </details>
          )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar ao início
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }

    return (
      <ErrorBoundaryKey key={this.state.checkpoint}>
        {this.props.children}
      </ErrorBoundaryKey>
    )
  }
}

function ErrorBoundaryKey({ children }: { children: ReactNode }) {
  return <>{children}</>
}