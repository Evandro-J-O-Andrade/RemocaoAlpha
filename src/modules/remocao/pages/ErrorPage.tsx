import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { StatePage } from '@/modules/remocao/components/StatePage'

interface ErrorPageProps {
  title?: string
  description?: string
  errorCode?: string
  onRetry?: () => void
  onHome?: () => void
}

export function ErrorPage({
  title = 'Algo não saiu como esperado',
  description = 'Ocorreu um erro inesperado. Nossa equipe foi notificada e trabalha para corrigir.',
  errorCode,
  onRetry,
  onHome,
}: ErrorPageProps) {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  const handleHome = () => {
    if (onHome) return onHome()
    navigate('/', { replace: true })
  }

  return (
    <StatePage
      variant="error"
      icon={<AlertTriangle size={40} />}
      title={title}
      description={description}
    >
      {errorCode && (
        <p className="mb-4 text-xs text-muted-foreground">
          Código de referência: <code className="rounded bg-muted px-1">{errorCode}</code>
        </p>
      )}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={retrying ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
          {retrying ? 'Tentando novamente...' : 'Tentar novamente'}
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Home className="mr-2 h-4 w-4" />
          Voltar ao início
        </button>
        <details className="text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            <Bug className="mr-1 inline h-3 w-3" />
            Detalhes técnicos
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">
            {errorCode ? `Reference: ${errorCode}` : 'No reference code available'}
          </pre>
        </details>
      </div>
    </StatePage>
  )
}