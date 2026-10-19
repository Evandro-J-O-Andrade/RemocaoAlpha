import { clsx } from 'clsx'
import type { RemocaoSummary } from '@/modules/remocao/types'

export function ResumoCartoes({ summary }: { summary: RemocaoSummary }) {
  const cards: {
    label: string
    value: number
    icon: string
    variant: SummaryCardProps['variant']
    description: string
  }[] = [
    {
      label: 'Programadas',
      value: summary.total_programadas,
      icon: '📋',
      variant: 'yellow',
      description: 'Total de remoções do dia',
    },
    {
      label: 'Aguardando Motorista',
      value: summary.aguardando_motorista,
      icon: '🚗',
      variant: 'pink',
      description: 'Precisam de motorista',
    },
    {
      label: 'Em Deslocamento',
      value: summary.em_deslocamento,
      icon: '🚑',
      variant: 'blue',
      description: 'Veículos em trânsito',
    },
    {
      label: 'Críticas',
      value: summary.criticas,
      icon: '🔴',
      variant: 'red',
      description: 'Emergenciais/urgentes',
    },
    {
      label: 'Concluídas',
      value: summary.concluidas,
      icon: '✅',
      variant: 'green',
      description: 'Finalizadas hoje',
    },
    {
      label: 'Intercorrências',
      value: summary.intercorrencias,
      icon: '⚠️',
      variant: 'red',
      description: 'Eventos registrados',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <SummaryCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          variant={card.variant}
          description={card.description}
        />
      ))}
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  icon: string
  variant: 'yellow' | 'pink' | 'blue' | 'red' | 'green' | 'gray'
  description?: string
}

function SummaryCard({ label, value, icon, variant, description }: SummaryCardProps) {
  const variantClasses: Record<SummaryCardProps['variant'], string> = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    pink: 'bg-pink-50 border-pink-200 text-pink-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  }

  return (
    <div
      className={clsx(
        'rounded-lg border p-4 text-center transition-transform hover:scale-[1.02]',
        variantClasses[variant]
      )}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      {description && (
        <div className="text-xs opacity-70 mt-1">{description}</div>
      )}
    </div>
  )
}
