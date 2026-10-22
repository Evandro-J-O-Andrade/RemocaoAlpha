import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, CalendarDays, RefreshCw, Truck, XCircle } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

interface UnitOption {
  id: string
  nome: string
}

interface DashboardRow {
  status: string | null
  finalidade: string | null
  tipo_transporte: string | null
  origem_unidade_id: string | null
  origem_unidade_nome: string | null
  prioridade: string | null
  created_at: string | null
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString()
}

function displayLabel(value: string) {
  return value.replaceAll('_', ' ').toLocaleLowerCase('pt-BR').replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('pt-BR'))
}

function Distribution({ title, values, emptyText }: { title: string; values: Record<string, number>; emptyText: string }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, count]) => count))
  return (
    <section className="remocao-card p-4">
      <h2 className="mb-3 font-semibold text-foreground">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([label, count]) => (
            <li key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{displayLabel(label || 'não informado')}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function DashboardAnaliticoPage() {
  const { user } = useAuth()
  const [units, setUnits] = useState<UnitOption[]>([])
  const [unitId, setUnitId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<DashboardRow[]>([])
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
    async function loadData() {
      setLoading(true)
      setError(null)
      if (!user?.tenant_id) {
        setRows([])
        setError('O tenant ativo não foi resolvido. Atualize a sessão ou solicite a correção do vínculo de acesso.')
        setLoading(false)
        return
      }

      try {
        const allRows: DashboardRow[] = []
        let offset = 0
        let expectedCount: number | null = null
        while (true) {
          let query = supabase
            .from('remocao_dashboard')
            .select('status, finalidade, tipo_transporte, origem_unidade_id, origem_unidade_nome, prioridade, created_at', { count: 'exact' })
            .eq('tenant_id', user.tenant_id)
          if (unitId) query = query.eq('origem_unidade_id', unitId)
          if (fromDate) query = query.gte('created_at', startOfDay(fromDate))
          if (toDate) query = query.lte('created_at', endOfDay(toDate))
          const { data, error: queryError, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + 999)
          if (queryError) throw queryError
          const batch = (data || []) as DashboardRow[]
          if (offset === 0) expectedCount = count ?? batch.length
          allRows.push(...batch)
          if (batch.length < 1000 || allRows.length >= (expectedCount ?? 0)) break
          offset += batch.length
        }
        if (!cancelled) setRows(allRows)
      } catch (cause) {
        if (cancelled) return
        const value = cause as { message?: string; code?: string }
        setError(value?.message
          ? `Não foi possível carregar os indicadores: ${value.message}${value.code ? ` (${value.code})` : ''}`
          : 'Não foi possível carregar os indicadores. Tente novamente.')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [user?.tenant_id, unitId, fromDate, toDate, retryKey])

  const byStatus: Record<string, number> = {}
  const byUnit: Record<string, number> = {}
  const byTransport: Record<string, number> = {}
  let pending = 0
  let cancelled = 0
  let critical = 0
  for (const row of rows) {
    const status = row.status || 'não informado'
    const unit = row.origem_unidade_nome || 'sem unidade de origem'
    const transport = row.tipo_transporte || row.finalidade || 'não informado'
    byStatus[status] = (byStatus[status] || 0) + 1
    byUnit[unit] = (byUnit[unit] || 0) + 1
    byTransport[transport] = (byTransport[transport] || 0) + 1
    if (['SOLICITADA', 'EM_AVALIACAO', 'AGUARDANDO_DESTINO', 'DESTINO_CONFIRMADO', 'AGUARDANDO_EQUIPE', 'EQUIPE_CONFIRMADA', 'AGUARDANDO_MOTORISTA', 'MOTORISTA_CHECKIN', 'MOTORISTA_CONFIRMADO', 'CHECKLIST_PENDENTE', 'PRONTA_PARA_SAIDA'].includes(status)) pending++
    if (status === 'CANCELADA') cancelled++
    if (row.prioridade === 'emergencial' && !['ENCERRADA', 'CANCELADA'].includes(status)) critical++
  }

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <header className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">DASHBOARD ANALÍTICO</p>
            <h1 className="remocao-page__title">Gestão de Remoções</h1>
            <p className="remocao-page__subtitle">Indicadores agregados dos dados reais visíveis no tenant ativo.</p>
          </div>
          <button type="button" className="remocao-btn remocao-btn--secondary" onClick={() => setRetryKey((current) => current + 1)} disabled={loading}>
            <RefreshCw size={15} /> Atualizar
          </button>
        </header>

        <section className="remocao-card mb-5 p-4" aria-label="Filtros do dashboard">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="remocao-field">
              <label htmlFor="analytics-from">Data inicial</label>
              <input id="analytics-from" type="date" className="remocao-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="remocao-field">
              <label htmlFor="analytics-to">Data final</label>
              <input id="analytics-to" type="date" className="remocao-input" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
            <div className="remocao-field">
              <label htmlFor="analytics-unit">Unidade de origem</label>
              <select id="analytics-unit" className="remocao-input" value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                <option value="">Todas as unidades autorizadas</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.nome}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">O período considera a data de criação. O banco continua responsável pelo isolamento e pela autorização dos registros.</p>
        </section>

        {error && <div className="remocao-alert remocao-alert--danger mb-4" role="alert"><AlertTriangle size={16} className="inline mr-2" />{error}</div>}

        {loading ? (
          <div className="remocao-empty" role="status"><span className="remocao-spinner" /><p className="remocao-empty__text">Calculando indicadores com os registros autorizados…</p></div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <section className="remocao-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity size={16} /> Total de remoções</div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{rows.length}</p>
                <Link to="/relatorios/remocoes-periodo" className="mt-2 inline-block text-xs font-semibold text-primary">Ver relatório detalhado →</Link>
              </section>
              <section className="remocao-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays size={16} /> Pendentes</div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{pending}</p>
                <Link to="/relatorios/remocoes-pendentes" className="mt-2 inline-block text-xs font-semibold text-primary">Ver pendências →</Link>
              </section>
              <section className="remocao-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><XCircle size={16} /> Canceladas</div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{cancelled}</p>
                <Link to="/relatorios/remocoes-canceladas" className="mt-2 inline-block text-xs font-semibold text-primary">Ver cancelamentos →</Link>
              </section>
              <section className="remocao-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Truck size={16} /> Críticas abertas</div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{critical}</p>
                <p className="mt-2 text-xs text-muted-foreground">Prioridade emergencial não encerrada/cancelada</p>
              </section>
            </div>

            {rows.length === 0 ? (
              <div className="remocao-empty">
                <p className="remocao-empty__title">Nenhuma remoção no período</p>
                <p className="remocao-empty__text">Ajuste os filtros ou confira se existem solicitações para o tenant e a unidade selecionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Distribution title="Distribuição por status" values={byStatus} emptyText="Sem dados de status." />
                <Distribution title="Volume por unidade de origem" values={byUnit} emptyText="Sem dados de unidade." />
                <Distribution title="Tipo de transporte" values={byTransport} emptyText="Sem dados de transporte." />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
