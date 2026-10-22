import { clsx } from 'clsx'
import type { RemocaoDashboardView, StatusRemocao } from '@/modules/remocao/types'
import { RemocaoCard } from '@/modules/remocao/components/RemocaoCard'

const COLUMNS: { key: StatusRemocao; label: string }[] = [
  { key: 'SOLICITADA', label: 'Solicitada' },
  { key: 'EM_AVALIACAO', label: 'Em avaliação' },
  { key: 'AGUARDANDO_DESTINO', label: 'Aguard. destino' },
  { key: 'DESTINO_CONFIRMADO', label: 'Destino confirmado' },
  { key: 'AGUARDANDO_EQUIPE', label: 'Aguard. equipe' },
  { key: 'EQUIPE_CONFIRMADA', label: 'Equipe confirmada' },
  { key: 'AGUARDANDO_MOTORISTA', label: 'Aguard. motorista' },
  { key: 'MOTORISTA_CHECKIN', label: 'Motorista check-in' },
  { key: 'MOTORISTA_CONFIRMADO', label: 'Motorista confirmado' },
  { key: 'CHECKLIST_PENDENTE', label: 'Checklist pendente' },
  { key: 'PRONTA_PARA_SAIDA', label: 'Pronta p/ saída' },
  { key: 'EM_DESLOCAMENTO', label: 'Em deslocamento' },
  { key: 'CHEGADA_DESTINO', label: 'Chegada destino' },
  { key: 'PACIENTE_ENTREGUE', label: 'Paciente entregue' },
  { key: 'RETORNANDO', label: 'Retornando' },
  { key: 'RETORNOU_UNIDADE', label: 'Retornou unidade' },
  { key: 'ENCERRADA', label: 'Encerrada' },
  { key: 'SUSPENSA', label: 'Suspensa' },
  { key: 'INTERCORRENCIA', label: 'Intercorrência' },
  { key: 'CANCELADA', label: 'Cancelada' },
  { key: 'NAO_REALIZADA', label: 'Não realizada' },
]

export function KanbanBoard({ remocoes, onCardClick }: {
  remocoes: RemocaoDashboardView[]
  onCardClick: (row: RemocaoDashboardView) => void
}) {
  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: remocoes.filter((r) => r.status === col.key),
  }))

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {grouped.map((col) => (
          <section key={col.key} className="w-64 shrink-0 rounded-xl border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <h3 className="text-xs font-bold text-foreground truncate">{col.label}</h3>
              <span className="text-xs tabular-nums text-muted-foreground">{col.items.length}</span>
            </header>
            <div className="space-y-2 p-2 min-h-[120px]">
              {col.items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-1">Sem registros</p>
              ) : (
                col.items.map((r) => (
                  <div key={r.id} className={clsx('cursor-pointer')} onClick={() => onCardClick(r)}>
                    <RemocaoCard remocao={r} onClick={() => onCardClick(r)} />
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
