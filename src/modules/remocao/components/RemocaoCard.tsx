import { Clock, AlertCircle } from 'lucide-react'
import type { RemocaoDashboardView } from '@/modules/remocao/types'
import { StatusBadge } from '@/modules/remocao/components/Alert'

export function RemocaoCard({ remocao, onClick }: {
  remocao: RemocaoDashboardView
  onClick: () => void
}) {
  const isCritical = remocao.prioridade === 'emergencial'

  return (
    <div
      className="remocao-card card-hover"
      style={{ borderLeftColor: getBorderColor(remocao.prioridade, remocao.status) }}
      onClick={onClick}
    >
      <div className="remocao-card__header">
        <div>
          <span className="remocao-small remocao-muted">#{remocao.numero}</span>
          <h3 className="remocao-page__title" style={{ fontSize: '16px', marginBottom: 0 }}>{remocao.paciente_nome}</h3>
        </div>
        {isCritical && <AlertCircle className="remocao-text--danger" size={16} />}
      </div>

      <div className="remocao-card__body">
        <div className="remocao-small">
          <div className="remocao-between">
            <span className="remocao-muted">Origem:</span>
            <span>{remocao.origem_unidade_nome || '—'}</span>
          </div>
          <div className="remocao-between">
            <span className="remocao-muted">Destino:</span>
            <span>{remocao.destino_unidade_nome || remocao.destino_endereco || '—'}</span>
          </div>
          <div className="remocao-between">
            <span className="remocao-muted">Classificação:</span>
            <span>{remocao.tipo_transporte || '—'}</span>
          </div>
          {remocao.motorista_nome && (
            <div className="remocao-between">
              <span className="remocao-muted">Motorista:</span>
              <span>{remocao.motorista_nome}</span>
            </div>
          )}
          <div className="remocao-between">
            <span className="remocao-muted">Status:</span>
            <StatusBadge status={getBadgeStatus(remocao.status)} />
          </div>
          {remocao.tempo_espera && (
            <div className="remocao-inline" style={{ marginTop: '4px' }}>
              <Clock size={12} />
              <span className="remocao-muted remocao-small">Esperando: {formatDuration(remocao.tempo_espera)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getBorderColor(priority: any, status: string): string {
  if (priority === 'emergencial') return '#ef4444'
  if (status === 'EM_DESLOCAMENTO') return '#3b82f6'
  if (status === 'CHECKLIST_PENDENTE') return '#eab308'
  return '#cbd5e1'
}

function getBadgeStatus(status: string): string {
  const map: Record<string, string> = {
    SOLICITADA: 'scheduled',
    EM_AVALIACAO: 'info',
    AGUARDANDO_DESTINO: 'scheduled',
    DESTINO_CONFIRMADO: 'scheduled',
    AGUARDANDO_EQUIPE: 'waiting-team',
    EQUIPE_CONFIRMADA: 'scheduled',
    AGUARDANDO_MOTORISTA: 'waiting-driver',
    MOTORISTA_CHECKIN: 'scheduled',
    MOTORISTA_CONFIRMADO: 'scheduled',
    CHECKLIST_PENDENTE: 'scheduled',
    PRONTA_PARA_SAIDA: 'in-transit',
    EM_DESLOCAMENTO: 'in-transit',
    CHEGADA_DESTINO: 'in-transit',
    PACIENTE_ENTREGUE: 'delivered',
    RETORNANDO: 'in-transit',
    RETORNOU_UNIDADE: 'scheduled',
    ENCERRADA: 'delivered',
    CANCELADA: 'cancelled',
    SUSPENSA: 'cancelled',
    INTERCORRENCIA: 'critical',
    NAO_REALIZADA: 'cancelled',
  }
  return map[status] || 'scheduled'
}

function formatDuration(isoInterval: string): string {
  try {
    const [seconds] = isoInterval.match(/(\d+) seconds/) || [0, '0']
    const secs = parseInt(seconds.toString() || '0')
    const min = Math.floor(secs / 60)
    const remSec = secs % 60
    return `${min}min ${remSec}s`
  } catch {
    return '--'
  }
}
