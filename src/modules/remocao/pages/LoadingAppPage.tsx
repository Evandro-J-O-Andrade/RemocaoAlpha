import { Loader2, Clock, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { StatePage } from '@/modules/remocao/components/StatePage'

export function LoadingAppPage() {
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)

  // Timeout de segurança: após 30s sem sucesso, offer retry
  useEffect(() => {
    const timer = setTimeout(() => setFailed(true), 30000)
    return () => clearTimeout(timer)
  }, [])

  if (failed) {
    return (
      <StatePage
        variant="fallback"
        icon={<Clock size={40} />}
        title="Carregamento demorando mais que o esperado"
        description="Estamos tentando inicializar o sistema. Isso está levando mais tempo do que o normal."
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setFailed(false)
              window.location.reload()
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Ir para login
          </button>
        </div>
      </StatePage>
    )
  }

  return (
    <StatePage
      variant="loading"
      icon={<Loader2 size={40} className="animate-spin" />}
      title="Preparando sua gestão"
      description="Validando sessão e carregando dados essenciais..."
      showLogo={false}
    >
      <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </StatePage>
  )
}