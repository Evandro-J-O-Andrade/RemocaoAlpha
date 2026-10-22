import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, FileSearch, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Perm } from '@/modules/remocao/permissions'

const PAGE_SIZE = 25
const PENDING_STATUSES = [
  'SOLICITADA',
  'EM_AVALIACAO',
  'AGUARDANDO_DESTINO',
  'DESTINO_CONFIRMADO',
  'AGUARDANDO_EQUIPE',
  'EQUIPE_CONFIRMADA',
  'AGUARDANDO_MOTORISTA',
  'MOTORISTA_CHECKIN',
  'MOTORISTA_CONFIRMADO',
  'CHECKLIST_PENDENTE',
  'PRONTA_PARA_SAIDA',
]

const REPORTS: Record<string, { title: string; description: string; permission: string }> = {
  'remocoes-periodo': {
    title: 'Remoções por período',
    description: 'Solicitações criadas no intervalo selecionado, com data, status, origem e destino.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  'remocoes-status': {
    title: 'Remoções por status',
    description: 'Remoções agrupadas para consulta por status operacional.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  'remocoes-unidade': {
    title: 'Remoções por unidade',
    description: 'Solicitações filtradas pela unidade de origem autorizada.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  'remocoes-transporte': {
    title: 'Remoções por tipo de transporte',
    description: 'Finalidade e classificação do transporte registrados na solicitação.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  'remocoes-pendentes': {
    title: 'Remoções pendentes e sem atribuição',
    description: 'Solicitações que ainda aguardam uma etapa operacional.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  'remocoes-canceladas': {
    title: 'Cancelamentos e motivos',
    description: 'Solicitações canceladas e seus motivos registrados.',
    permission: Perm.REMOCACAO_VISUALIZAR,
  },
  auditoria: {
    title: 'Auditoria de operações',
    description: 'Eventos de auditoria registrados no escopo do tenant ativo.',
    permission: Perm.AUDITORIA_CONSULTAR,
  },
}

const STATUS_OPTIONS = [
  ['SOLICITADA', 'Solicitada'],
  ['EM_AVALIACAO', 'Em avaliação'],
  ['AGUARDANDO_DESTINO', 'Aguardando destino'],
  ['DESTINO_CONFIRMADO', 'Destino confirmado'],
  ['AGUARDANDO_EQUIPE', 'Aguardando equipe'],
  ['EQUIPE_CONFIRMADA', 'Equipe confirmada'],
  ['AGUARDANDO_MOTORISTA', 'Aguardando motorista'],
  ['EM_DESLOCAMENTO', 'Em deslocamento'],
  ['CHEGADA_DESTINO', 'Chegada ao destino'],
  ['PACIENTE_ENTREGUE', 'Paciente entregue'],
  ['ENCERRADA', 'Encerrada'],
  ['CANCELADA', 'Cancelada'],
  ['INTERCORRENCIA', 'Intercorrência'],
] as const

function dateStart(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function dateEnd(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString()
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR')
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { user } = useAuth()
  const report = reportId ? REPORTS[reportId] : undefined
  const canAccess = Boolean(user?.is_root || (report && user?.permissions.includes(report.permission as any)))
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [unitId, setUnitId] = useState('')
  const [status, setStatus] = useState('')
  const [units, setUnits] = useState<Array<{ id: string; nome: string }>>([])
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!user?.tenant_id) {
      setUnits([])
      return
    }
    let cancelled = false
    void supabase
      .from('remocao_unidade')
      .select('id, nome')
      .eq('tenant_id', user.tenant_id)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        if (!cancelled) setUnits(data || [])
      })
    return () => { cancelled = true }
  }, [user?.tenant_id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      if (!report || !canAccess) {
        setRows([])
        setTotal(0)
        setLoading(false)
        return
      }
      if (!user?.tenant_id) {
        setError('O tenant ativo não foi resolvido. Atualize a sessão ou solicite a correção do vínculo de acesso.')
        setRows([])
        setTotal(0)
        setLoading(false)
        return
      }

      try {
        const start = fromDate ? dateStart(fromDate) : null
        const end = toDate ? dateEnd(toDate) : null
        const offset = page * PAGE_SIZE

        if (reportId === 'auditoria') {
          let query = supabase
            .from('remocao_auditoria')
            .select('id, acao, entidade, registro_id, usuario_nome, usuario_role, created_at', { count: 'exact' })
            .eq('tenant_id', user.tenant_id)
          if (start) query = query.gte('created_at', start)
          if (end) query = query.lte('created_at', end)
          const { data, error: queryError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)
          if (queryError) throw queryError
          if (!cancelled) {
            setRows((data || []) as unknown as Array<Record<string, unknown>>)
            setTotal(count || 0)
          }
        } else {
          let query = supabase
            .from('remocao_dashboard')
            .select('id, numero, paciente_nome, origem_unidade_id, origem_unidade_nome, destino_unidade_nome, destino_endereco, finalidade, tipo_transporte, prioridade, status, data_prevista, horario_previsto_saida, created_at, motivo_cancelamento, veiculo_placa, motorista_nome', { count: 'exact' })
            .eq('tenant_id', user.tenant_id)
          if (start) query = query.gte('created_at', start)
          if (end) query = query.lte('created_at', end)
          if (unitId) query = query.eq('origem_unidade_id', unitId)
          if (status) query = query.eq('status', status as any)
          if (reportId === 'remocoes-pendentes') query = query.in('status', PENDING_STATUSES as any)
          if (reportId === 'remocoes-canceladas') query = query.eq('status', 'CANCELADA' as any)
          const { data, error: queryError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)
          if (queryError) throw queryError
          if (!cancelled) {
            setRows((data || []) as unknown as Array<Record<string, unknown>>)
            setTotal(count || 0)
          }
        }
      } catch (cause) {
        if (cancelled) return
        const value = cause as { code?: string; message?: string }
        setError(value?.message
          ? `Não foi possível carregar este relatório: ${value.message}${value.code ? ` (${value.code})` : ''}`
          : 'Não foi possível carregar este relatório. Tente novamente.')
        setRows([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [reportId, report, canAccess, user?.tenant_id, fromDate, toDate, unitId, status, page, retryKey])

  if (!report) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-alert remocao-alert--danger" role="alert">Este relatório não existe ou ainda não foi implementado.</div>
          <Link to="/relatorios" className="remocao-btn remocao-btn--secondary mt-4">Voltar aos relatórios</Link>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-alert remocao-alert--danger" role="alert">Seu perfil não possui permissão para consultar este relatório.</div>
          <Link to="/relatorios" className="remocao-btn remocao-btn--secondary mt-4">Voltar aos relatórios</Link>
        </div>
      </div>
    )
  }

  const audit = reportId === 'auditoria'
  const columns = audit
    ? [
        { key: 'created_at', label: 'Data', date: true },
        { key: 'usuario_nome', label: 'Usuário' },
        { key: 'usuario_role', label: 'Perfil' },
        { key: 'acao', label: 'Ação' },
        { key: 'entidade', label: 'Entidade' },
        { key: 'registro_id', label: 'Registro' },
      ]
    : reportId === 'remocoes-status'
      ? [
          { key: 'numero', label: 'Nº' },
          { key: 'paciente_nome', label: 'Paciente' },
          { key: 'status', label: 'Status' },
          { key: 'prioridade', label: 'Prioridade' },
          { key: 'created_at', label: 'Criada em', date: true },
        ]
      : reportId === 'remocoes-unidade'
        ? [
            { key: 'numero', label: 'Nº' },
            { key: 'origem_unidade_nome', label: 'Origem' },
            { key: 'destino_unidade_nome', label: 'Destino' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Criada em', date: true },
          ]
        : reportId === 'remocoes-transporte'
          ? [
              { key: 'numero', label: 'Nº' },
              { key: 'finalidade', label: 'Finalidade' },
              { key: 'tipo_transporte', label: 'Tipo de transporte' },
              { key: 'prioridade', label: 'Prioridade' },
              { key: 'status', label: 'Status' },
            ]
          : reportId === 'remocoes-canceladas'
            ? [
                { key: 'numero', label: 'Nº' },
                { key: 'paciente_nome', label: 'Paciente' },
                { key: 'motivo_cancelamento', label: 'Motivo do cancelamento' },
                { key: 'created_at', label: 'Criada em', date: true },
              ]
            : [
                { key: 'numero', label: 'Nº' },
                { key: 'paciente_nome', label: 'Paciente' },
                { key: 'origem_unidade_nome', label: 'Origem' },
                { key: 'destino_unidade_nome', label: 'Destino' },
                { key: 'finalidade', label: 'Finalidade' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Criada em', date: true },
              ]

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <nav aria-label="Trilha de navegação" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/relatorios" className="inline-flex items-center gap-2 hover:text-foreground"><ArrowLeft size={16} /> Relatórios</Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-foreground">{report.title}</span>
        </nav>
        <header className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">RELATÓRIO OPERACIONAL</p>
            <h1 className="remocao-page__title">{report.title}</h1>
            <p className="remocao-page__subtitle">{report.description}</p>
          </div>
        </header>

        <section className="remocao-card mb-4 p-4" aria-label="Filtros do relatório">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="remocao-field">
              <label htmlFor="report-from">De</label>
              <input id="report-from" type="date" className="remocao-input" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0) }} />
            </div>
            <div className="remocao-field">
              <label htmlFor="report-to">Até</label>
              <input id="report-to" type="date" className="remocao-input" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0) }} />
            </div>
            {!audit && (
              <div className="remocao-field">
                <label htmlFor="report-unit">Unidade de origem</label>
                <select id="report-unit" className="remocao-input" value={unitId} onChange={(e) => { setUnitId(e.target.value); setPage(0) }}>
                  <option value="">Todas as unidades autorizadas</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.nome}</option>)}
                </select>
              </div>
            )}
            {!audit && (
              <div className="remocao-field">
                <label htmlFor="report-status">Status</label>
                <select id="report-status" className="remocao-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}>
                  <option value="">Todos os status</option>
                  {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Resultados limitados ao tenant e às unidades que o banco autoriza para sua sessão.</p>
            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="remocao-btn remocao-btn--secondary remocao-btn--sm" disabled={loading}>
              <RefreshCw size={14} /> Atualizar relatório
            </button>
          </div>
        </section>

        {error && <div className="remocao-alert remocao-alert--danger mb-4" role="alert"><AlertTriangle size={16} className="inline mr-2" />{error}</div>}

        <section className="remocao-card p-0" aria-label="Resultados do relatório">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2"><FileSearch size={18} className="text-primary" /><h2 className="font-semibold">{report.title}</h2></div>
            <span className="text-sm text-muted-foreground" aria-live="polite">{loading ? 'Carregando…' : `${total} registros`}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Consultando o banco de dados…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-foreground">Nenhum registro encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">Altere os filtros ou confira se existem dados no período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="remocao-table min-w-full">
                <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={String(row.id ?? index)}>
                      {columns.map((column) => (
                        <td key={column.key} className="max-w-[280px] truncate" title={formatValue(row[column.key])}>
                          {column.date ? formatDate(row[column.key]) : formatValue(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <div className="flex gap-2">
              <button type="button" className="remocao-btn remocao-btn--secondary remocao-btn--sm" disabled={page === 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))}>Anterior</button>
              <button type="button" className="remocao-btn remocao-btn--secondary remocao-btn--sm" disabled={loading || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)}>Próxima</button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
