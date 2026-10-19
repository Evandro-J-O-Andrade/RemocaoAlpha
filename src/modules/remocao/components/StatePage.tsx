import { type ReactNode } from 'react'
import { clsx } from 'clsx'

export type StateVariant =
  | 'loading'
  | 'success'
  | 'error'
  | 'fallback'
  | 'rollback'
  | 'not-found'
  | 'unauthorized'
  | 'forbidden'
  | 'maintenance'

interface StatePageProps {
  variant: StateVariant
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
  className?: string
  showLogo?: boolean
}

const variantStyles: Record<StateVariant, { accent: string; iconBg: string }> = {
  loading: { accent: 'text-primary', iconBg: 'bg-primary/10' },
  success: { accent: 'text-emerald-500', iconBg: 'bg-emerald-500/10' },
  error: { accent: 'text-destructive', iconBg: 'bg-destructive/10' },
  fallback: { accent: 'text-amber-500', iconBg: 'bg-amber-500/10' },
  rollback: { accent: 'text-blue-500', iconBg: 'bg-blue-500/10' },
  'not-found': { accent: 'text-muted-foreground', iconBg: 'bg-muted' },
  unauthorized: { accent: 'text-orange-500', iconBg: 'bg-orange-500/10' },
  forbidden: { accent: 'text-red-600', iconBg: 'bg-red-600/10' },
  maintenance: { accent: 'text-primary', iconBg: 'bg-primary/10' },
}

export function StatePage({
  variant,
  icon,
  title,
  description,
  children,
  className,
  showLogo = true,
}: StatePageProps) {
  const { accent, iconBg } = variantStyles[variant]

  return (
    <div
      className={clsx(
        'flex min-h-screen flex-col items-center justify-center',
        'bg-background px-4 py-8 text-center',
        className
      )}
    >
      {showLogo && (
        <div className="mb-8">
          <img
            src="/img/alpha_branco_vazado_FINAL.webp"
            alt="Remocao Alpha"
            className="mx-auto h-10 w-auto opacity-80"
          />
        </div>
      )}

      <div className="flex w-full max-w-md flex-col items-center">
        <div
          className={clsx(
            'mb-6 flex h-20 w-20 items-center justify-center rounded-full',
            iconBg
          )}
        >
          <span className={clsx('h-10 w-10', accent)}>{icon}</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>

        {children && <div className="w-full">{children}</div>}
      </div>

      <footer className="mt-12 text-xs text-muted-foreground">
        © 2026 RemocaoAlpha — New Wave Sistema Digital
      </footer>
    </div>
  )
}