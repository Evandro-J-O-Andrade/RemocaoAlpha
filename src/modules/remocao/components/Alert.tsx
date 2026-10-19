import { useEffect, useState, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import type { AlertaRemocao } from '@/modules/remocao/types'

export type AlertType = 'info' | 'warning' | 'critical' | 'success'
export type AlertSize = 'sm' | 'md' | 'lg'

export interface AlertProps {
  type?: AlertType
  title?: string
  message?: string
  icon?: ReactNode
  dismissible?: boolean
  autoDismiss?: number
  children?: ReactNode
  className?: string
}

const alertStyles: Record<AlertType, string> = {
  info: 'remocao-alert--info',
  warning: 'remocao-alert--warning',
  critical: 'remocao-alert--critical',
  success: 'remocao-alert--success',
}

export function Alert({
  type = 'info',
  title,
  message,
  icon,
  dismissible = true,
  autoDismiss,
  children,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autoDismiss) {
      timeoutRef.current = setTimeout(() => setVisible(false), autoDismiss)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [autoDismiss])

  if (!visible) return null

  return (
    <div
      className={clsx(
        'remocao-alert',
        alertStyles[type],
        className
      )}
    >
      {icon && <span className="remocao-alert__icon mt-0.5 shrink-0">{icon}</span>}
      <div className="remocao-alert__content">
        {title && <h4 className="remocao-alert__title">{title}</h4>}
        {message && <p className="remocao-alert__text">{message}</p>}
        {children}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="remocao-icon-btn remocao-btn--ghost"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function StatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const statusMap: Record<string, { label: string; className: string; icon: string }> = {
    scheduled: { label: 'Agendada', className: 'remocao-status--scheduled', icon: '📋' },
    'waiting-team': { label: 'Aguardando equipe', className: 'remocao-status--waiting-team', icon: '👥' },
    'waiting-driver': { label: 'Aguardando motorista', className: 'remocao-status--waiting-driver', icon: '🚗' },
    critical: { label: 'Crítica/Urgente', className: 'remocao-status--critical', icon: '🔴' },
    'in-transit': { label: 'Em transporte', className: 'remocao-status--moving', icon: '🚑' },
    delivered: { label: 'Entregue', className: 'remocao-status--delivered', icon: '✅' },
    cancelled: { label: 'Cancelada', className: 'remocao-status--cancelled', icon: '🚫' },
  }

  const config = statusMap[status] || { label: status, className: 'remocao-status--cancelled', icon: '❓' }

  return (
    <span
      className={clsx(
        'remocao-status',
        config.className
      )}
      aria-label={config.label}
    >
      {showIcon && <span className="remocao-status__dot" />}
      <span>{config.icon} {config.label}</span>
    </span>
  )
}

export function RemocaoAlertBanner({ alerta }: { alerta: AlertaRemocao }) {
  const priorityMap: Record<AlertaRemocao['prioridade'], AlertType> = {
    baixa: 'info',
    media: 'warning',
    alta: 'warning',
    critica: 'critical',
  }

  return (
    <Alert
      type={priorityMap[alerta.prioridade]}
      title={alerta.titulo}
      message={alerta.mensagem}
      icon={<span className="remocao-alert__icon">{alerta.icone}</span>}
      autoDismiss={alerta.prioridade === 'critica' ? undefined : 10000}
      className="alert-pulse"
    />
  )
}
