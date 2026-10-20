import { Component, type ReactNode } from 'react'
import { ErrorPage } from '@/modules/remocao/pages/ErrorPage'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorCode: string | undefined
  checkpoint: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorCode: undefined, checkpoint: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorCode: `ERR-${Date.now().toString(36).toUpperCase()}` }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    this.props.onError?.(error, info)
  }

  handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorCode: undefined,
      checkpoint: prev.checkpoint + 1,
    }))
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <ErrorPage
          errorCode={this.state.errorCode}
          onRetry={this.handleReset}
          onHome={this.handleHome}
        />
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