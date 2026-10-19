import { clsx } from 'clsx'
import { AlertCircle } from 'lucide-react'
import type { RemocaoDashboardView, StatusRemocao } from '@/modules/remocao/types'
import { StatusBadge } from '@/modules/remocao/components/Alert'
import { getStatusConfig } from '@/modules/remocao/alerts/statusConfig'
import { formatDistanceToTime } from '@/modules/remocao/utils/time'

export function FilaOperacional({
  remocoes,
  onRemocaoClick,
}: {
  remocoes: RemocaoDashboardView[]
  onRemocaoClick: (r: RemocaoDashboardView) => void
}) {
  return (
    <div className="remocao-table-wrap">
      <table className="remocao-table">
        <thead>
          <tr>
            <th>Prioridade</th>
            <th>Paciente</th>
            <th>Origem → Destino</th>
            <th>Finalidade</th>
            <th>Classificação</th>
            <th>Equipe</th>
            <th>Motorista</th>
            <th>Horário</th>
            <th>Status</th>
            <th>Tempo de espera</th>
            <th>Alerta</th>
          </tr>
        </thead>
        <tbody>
          {remocoes.map((r) => (
            <FilaRow key={r.id} remocao={r} onClick={() => onRemocaoClick(r)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FilaRow({ remocao, onClick }: { remocao: RemocaoDashboardView; onClick: () => void }) {
  const statusConfig = getStatusConfig(remocao.status as StatusRemocao)
  const isCritical = remocao.prioridade === 'emergencial' || statusConfig.critical

  const prioridadeIcon =
    remocao.prioridade === 'emergencial' ? '🔴' :
    remocao.prioridade === 'urgente' ? '🟠' : '⚪'

  return (
    <tr
      className={clsx('cursor-pointer transition-colors hover:bg-gray-50', isCritical && 'remocao-row--critical')}
      onClick={onClick}
    >
      <td className="remocao-table__primary">
        <span className="remocao-inline">
          <span className="text-lg">{prioridadeIcon}</span>
          <span className="font-medium capitalize">{remocao.prioridade}</span>
        </span>
      </td>
      <td>
        <div className="remocao-table__primary">{remocao.paciente_nome}</div>
        <div className="remocao-table__secondary">
          {remocao.paciente_prontuario && `Pront: ${remocao.paciente_prontuario}`}
          {remocao.paciente_condicao_clinica && ` • ${remocao.paciente_condicao_clinica}`}
        </div>
      </td>
      <td>
        <div className="remocao-inline">
          <span>{remocao.origem_unidade_nome || '—'}</span>
          <span className="remocao-text-soft">→</span>
          <span>{remocao.destino_unidade_nome || remocao.destino_endereco || '—'}</span>
        </div>
        {remocao.origem_leito && (
          <span className="remocao-table__secondary">Leito: {remocao.origem_leito}</span>
        )}
      </td>
      <td>
        <span className="remocao-small">{getFinalidadeLabel(remocao.finalidade)}</span>
      </td>
      <td>
        <span className="remocao-status remocao-priority remocao-priority--normal">
          {remocao.tipo_transporte || remocao.nivel_suporte || '—'}
        </span>
      </td>
      <td>
        <TeamDisplay remocao={remocao} />
      </td>
      <td>
        {remocao.motorista_nome ? (
          <span className="remocao-inline">
            <span className="remocao-small">{remocao.motorista_nome}</span>
            <span className={`w-2 h-2 rounded-full ${getMotoristaDot(remocao.motorista_status || undefined)}`} />
          </span>
        ) : (
          <span className="remocao-text-soft remocao-small">—</span>
        )}
      </td>
      <td>
        {remocao.horario_previsto_saida
          ? new Date(remocao.horario_previsto_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '—'}
      </td>
      <td>
        <StatusBadge status={getStatusBadgeClass(remocao.status)} />
        <div className="remocao-table__secondary">{statusConfig.label}</div>
      </td>
      <td>
        <span className="remocao-timer">{formatDistanceToTime(remocao.created_at, remocao.tempo_espera as string)}</span>
      </td>
      <td>
        {isCritical && (
          <span className="remocao-inline remocao-text--danger">
            <AlertCircle size={14} /> Crítica
          </span>
        )}
      </td>
    </tr>
  )
}

function TeamDisplay({ remocao }: { remocao: RemocaoDashboardView }) {
  const roles = []
  if (remocao.nivel_suporte === 'avancado') {
    roles.push('Motorista', 'Enfermeiro', 'Médico')
  } else if (remocao.nivel_suporte === 'intermediario') {
    roles.push('Motorista', 'Técnico')
  } else if (remocao.nivel_suporte === 'basico') {
    roles.push('Motorista', 'Técnico')
  } else {
    roles.push('Motorista', 'Técnico')
  }

  return (
    <div className="remocao-small">
      {roles.join(', ')}
    </div>
  )
}

function getMotoristaDot(status?: string): string {
  const map: Record<string, string> = {
    disponivel: 'bg-green-500',
    ocupado: 'bg-gray-500',
    em_deslocamento: 'bg-blue-500',
    em_retorno: 'bg-blue-400',
    indisponivel: 'bg-red-500',
  }
  return map[status || 'disponivel'] || 'bg-gray-300'
}

function getStatusBadgeClass(status: string): string {
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

function getFinalidadeLabel(f: string): string {
  const map: Record<string, string> = {
    exame: 'Exame externo',
    procedimento: 'Procedimento',
    consulta: 'Consulta',
    transferencia_inter_hospitalar: 'Transferência inter-hospitalar',
    transferencia_intra_rede: 'Transferência intra-rede',
    alta_hospitalar: 'Alta hospitalar',
    retorno_residencia: 'Retorno à residência',
    retorno_unidade_origem: 'Retorno à origem',
    outro: 'Outro',
  }
  return map[f] || f
}
