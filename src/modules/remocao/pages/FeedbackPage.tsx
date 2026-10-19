import { CheckCircle2, Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { StatePage } from '@/modules/remocao/components/StatePage'

type FeedbackType = 'success' | 'info' | 'warning' | 'error'

interface Props {
  type: FeedbackType
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

const config: Record<FeedbackType, { icon: typeof CheckCircle2; variant: any }> = {
  success: { icon: CheckCircle2, variant: 'success' },
  info: { icon: Info, variant: 'success' },
  warning: { icon: AlertTriangle, variant: 'fallback' },
  error: { icon: AlertOctagon, variant: 'error' },
}

export function FeedbackResultPage({
  type,
  title,
  description,
  actionLabel = 'Continuar',
  onAction,
  secondaryLabel,
  onSecondary,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'

  const { icon: Icon, variant } = config[type]

  const handleAction = () => {
    if (onAction) return onAction()
    navigate(from, { replace: true })
  }

  return (
    <StatePage
      variant={variant}
      icon={<Icon size={40} />}
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
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </StatePage>
  )
}