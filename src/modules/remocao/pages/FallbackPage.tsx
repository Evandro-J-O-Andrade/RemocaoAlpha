import { Server, CloudOff, Database, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatePage } from '@/modules/remocao/components/StatePage'

type FallbackReason = 'network' | 'service' | 'database' | 'module'

interface FallbackPageProps {
  reason?: FallbackReason
  title?: string
  description?: string
  availableFeatures?: string[]
  onRetry?: () => void
}

const config: Record<FallbackReason, { icon: typeof Server; title: string; description: string }> = {
  network: {
    icon: CloudOff,
    title: 'Conexão instável',
    description: 'Não foi possível acessar o servidor. Verifique sua conexão com a internet.',
  },
  service: {
    icon: Server,
    title: 'Serviço temporariamente indisponível',
    description: 'Um serviço essencial não está respondendo no momento. Nossa equipe foi alertada.',
  },
  database: {
    icon: Database,
    title: 'Indisponibilidade de dados',
    description: 'Não foi possível carregar as informações do banco de dados.',
  },
  module: {
    icon: Server,
    title: 'Módulo indisponível',
    description: 'Este recurso não está disponível no momento. Outras partes do sistema continuam funcionando.',
  },
}

export function FallbackPage({
  reason = 'service',
  title,
  description,
  availableFeatures,
  onRetry,
}: FallbackPageProps) {
  const navigate = useNavigate()
  const { icon: Icon, title: defaultTitle, description: defaultDescription } = config[reason]

  return (
    <StatePage
      variant="fallback"
      icon={<Icon size={40} />}
      title={title ?? defaultTitle}
      description={description ?? defaultDescription}
    >
      {availableFeatures && availableFeatures.length > 0 && (
        <div className="mb-4 text-left">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            O que ainda está disponível:
          </p>
          <ul className="space-y-1">
            {availableFeatures.map((f) => (
              <li key={f} className="flex items-center text-sm">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Home className="mr-2 h-4 w-4" />
          Voltar ao início
        </button>
      </div>
    </StatePage>
  )
}