import { RotateCcw, CheckCircle, Home } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { StatePage } from '@/modules/remocao/components/StatePage'

type RollbackStatus = 'reverting' | 'reverted' | 'failed'

interface RollbackPageProps {
  status?: RollbackStatus
  onAction?: () => void
  actionLabel?: string
}

const config: Record<RollbackStatus, { icon: typeof RotateCcw; title: string; description: string; variant: any }> = {
  reverting: {
    icon: RotateCcw,
    title: 'Revertendo alterações',
    description: 'Estamos restaurando o estado anterior do sistema. Isso pode levar alguns segundos.',
    variant: 'rollback',
  },
  reverted: {
    icon: CheckCircle,
    title: 'Estado anterior restaurado',
    description: 'As alterações foram desfeitas com sucesso. O sistema está no estado anterior.',
    variant: 'success',
  },
  failed: {
    icon: RotateCcw,
    title: 'Não foi possível reverter',
    description: 'A reversão automática não pôde ser concluída. Os dados podem estar em estado inconsistente.',
    variant: 'error',
  },
}

export function RollbackPage({
  status = 'reverted',
  onAction,
  actionLabel = 'Continuar',
}: RollbackPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'

  const { icon: Icon, title, description, variant } = config[status]

  const handleAction = () => {
    if (onAction) return onAction()
    navigate(from, { replace: true })
  }

  return (
    <StatePage
      variant={variant}
      icon={<Icon size={40} className={status === 'reverting' ? 'animate-spin' : ''} />}
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Home className="mr-2 h-4 w-4" />
          Ir para login
        </button>
      </div>
    </StatePage>
  )
}