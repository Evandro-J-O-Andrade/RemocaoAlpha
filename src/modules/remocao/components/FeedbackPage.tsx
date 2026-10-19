import { AlertTriangle, Server, RefreshCw, Home, Wrench, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { StatePage } from '@/modules/remocao/components/StatePage'

type FeedbackVariant = 'error' | 'fallback' | 'rollback' | 'not-found' | 'unauthorized' | 'forbidden' | 'maintenance' | 'success'

interface FeedbackPageProps {
  variant: FeedbackVariant
  title?: string
  description?: string
  onRetry?: () => void
  onHome?: () => void
  className?: string
}

const config: Record<FeedbackVariant, { icon: typeof AlertTriangle; accent: string; variant: 'error' | 'fallback' | 'rollback' | 'not-found' | 'unauthorized' | 'forbidden' | 'maintenance' | 'success' | 'loading' }> = {
  error: { icon: AlertTriangle, accent: 'text-destructive', variant: 'error' },
  fallback: { icon: Server, accent: 'text-amber-500', variant: 'fallback' },
  rollback: { icon: RefreshCw, accent: 'text-blue-500', variant: 'rollback' },
  'not-found': { icon: AlertTriangle, accent: 'text-muted-foreground', variant: 'not-found' },
  unauthorized: { icon: AlertTriangle, accent: 'text-orange-500', variant: 'unauthorized' },
  forbidden: { icon: AlertTriangle, accent: 'text-red-600', variant: 'forbidden' },
  maintenance: { icon: Wrench, accent: 'text-primary', variant: 'maintenance' },
  success: { icon: CheckCircle, accent: 'text-emerald-500', variant: 'success' },
}

const defaults: Record<FeedbackVariant, { title: string; description: string }> = {
  error: {
    title: 'Ops! Algo deu errado',
    description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada e trabalha para corrigir.',
  },
  fallback: {
    title: 'Serviço temporariamente indisponível',
    description: 'Não foi possível acessar um serviço essencial. Tentaremos acessar novamente em instantes.',
  },
  rollback: {
    title: 'Operação revertida com sucesso',
    description: 'As alterações foram desfeitas e o sistema está no estado anterior.',
  },
  'not-found': {
    title: 'Página não encontrada',
    description: 'A página que você está procurando não existe ou foi movida.',
  },
  unauthorized: {
    title: 'Acesso não autorizado',
    description: 'Você precisa estar logado para continuar.',
  },
  forbidden: {
    title: 'Acesso negado',
    description: 'Você não possui permissão para acessar esta página.',
  },
  maintenance: {
    title: 'Sistema em manutenção',
    description: 'Estamos realizando atualizações. O sistema voltará em breve.',
  },
  success: {
    title: 'Operação concluída',
    description: 'A ação foi realizada com sucesso.',
  },
}

export function FeedbackPage({
  variant,
  title,
  description,
  onRetry,
  onHome,
  className,
}: FeedbackPageProps) {
  const { icon: Icon, accent, variant: stateVariant } = config[variant]
  const resolvedTitle = title ?? defaults[variant].title
  const resolvedDescription = description ?? defaults[variant].description

  return (
    <StatePage
      variant={stateVariant}
      icon={<Icon size={40} className={accent} />}
      title={resolvedTitle}
      description={resolvedDescription}
      showLogo={false}
      className={className}
    >
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
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
        {onHome && (
          <button
            type="button"
            onClick={onHome}
            className={clsx(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
              onRetry
                ? 'border border-border bg-background hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <Home className="mr-2 h-4 w-4" />
            Ir para o início
          </button>
        )}
      </div>
    </StatePage>
  )
}