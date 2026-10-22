import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, Ambulance, ArrowDownRight, ArrowRight, CheckCircle2,
  Clock3, MapPin, Plus, RefreshCw, Search, ShieldAlert, Truck, XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/app/providers/AuthProvider'
import { hasEffectivePermission } from '@/modules/remocao/permissions/rbac'
import { Perm } from '@/modules/remocao/permissions'
import { useRemocao } from '@/modules/remocao/context/RemocaoContext'
import { FilaOperacional } from '@/modules/remocao/components/FilaOperacional'
import { GPSMap } from '@/modules/remocao/components/GPSMap'
import type { RemocaoDashboardView, StatusRemocao } from '@/modules/remocao/types'
import { supabase } from '@/lib/supabase/client'

type PipelineFilter = 'todas' | 'pendentes' | 'transito' | 'concluidas' | 'canceladas'
type FleetCounts = { available: number; active: number; total: number }

const ACTIVE_STATUSES: StatusRemocao[] = [
  'SOLICITADA', 'EM_AVALIACAO', 'AGUARDANDO_DESTINO', 'DESTINO_CONFIRMADO',
  'AGUARDANDO_EQUIPE', 'EQUIPE_CONFIRMADA', 'AGUARDANDO_MOTORISTA',
  'MOTORISTA_CHECKIN', 'MOTORISTA_CONFIRMADO', 'CHECKLIST_PENDENTE',
  'PRONTA_PARA_SAIDA', 'EM_DESLOCAMENTO', 'CHEGADA_DESTINO',
  'PACIENTE_ENTREGUE', 'RETORNANDO', 'RETORNOU_UNIDADE', 'INTERCORRENCIA', 'SUSPENSA',
]
const TRANSIT_STATUSES: StatusRemocao[] = [
  'EM_DESLOCAMENTO', 'CHEGADA_DESTINO', 'PACIENTE_ENTREGUE', 'RETORNANDO', 'RETORNOU_UNIDADE',
]
const CLOSED_STATUSES: StatusRemocao[] = ['ENCERRADA']
const CANCELLED_STATUSES: StatusRemocao[] = ['CANCELADA', 'NAO_REALIZADA']

function elapsedMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
}
function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}
function isActive(remocao: RemocaoDashboardView) {
  return ACTIVE_STATUSES.includes(remocao.status)
}
function isCritical(remocao: RemocaoDashboardView) {
  return remocao.prioridade === 'emergencial' || remocao.status === 'INTERCORRENCIA'
}
function MetricCard({
  label, value, detail, icon: Icon, tone = 'neutral',
}: {
  label: string; value: string | number; detail: string; icon: typeof Activity;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return (
    <section className={clsx(
      'min-w-0 rounded-xl border bg-card p-4',
      tone === 'danger' && 'border-destructive/35 bg-destructive/[0.035]',
      tone === 'warning' && 'border-amber-500/30 bg-amber-500/[0.035]',
      tone === 'success' && 'border-emerald-500/25',
      tone === 'info' && 'border-primary/25',
      tone === 'neutral' && 'border-border',
    )}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon size={17} className={clsx(
          tone === 'danger' && 'text-destructive',
          tone === 'warning' && 'text-amber-600',
          tone === 'success' && 'text-emerald-600',
          tone === 'info' && 'text-primary',
          tone === 'neutral' && 'text-muted-foreground',
        )} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </section>
  )
}

export function CentralRemocoesPage() {
  const { user } = useAuth()
  const canCreateRemocao = !!user && hasEffectivePermission(user.permissions, user.is_root, Perm.REMOCACAO_SOLICITAR)
  const {
    remocoes, filteredRemocoes, loading, error, refetch, filter, setFilter, setSelectedRemocao,
  } = useRemocao()
  const [pipeline, setPipeline] = useState<PipelineFilter>('todas')
  const [priority, setPriority] = useState<'all' | 'emergencial' | 'urgente' | 'rotina'>('all')
  const [search, setSearch] = useState(filter.search)
  const [fleet, setFleet] = useState<FleetCounts>({ available: 0, active: 0, total: 0 })
  const [fleetLoading, setFleetLoading] = useState(true)
  const [fleetError, setFleetError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadFleet() {
      if (!user?.tenant_id) {
        setFleet({ available: 0, active: 0, total: 0 })
        setFleetLoading(false)
        return
      }
      setFleetLoading(true)
      setFleetError(null)
      const { data, error: queryError } = await supabase
        .from('remocao_veiculo')
        .select('id, situacao')
        .eq('tenant_id', user.tenant_id)
      if (cancelled) return
      if (queryError) {
        setFleetError('Não foi possível consultar a frota autorizada.')
        setFleet({ available: 0, active: 0, total: 0 })
      } else {
        const vehicles = data || []
        setFleet({
          total: vehicles.length,
          available: vehicles.filter((vehicle) => vehicle.situacao === 'disponivel').length,
          active: vehicles.filter((vehicle) => vehicle.situacao === 'ocupado').length,
        })
      }
      setFleetLoading(false)
    }
    void loadFleet()
    return () => { cancelled = true }
  }, [user?.tenant_id, refreshKey])

  const visibleRemocoes = useMemo(() => {
    let rows = filteredRemocoes
    if (pipeline === 'pendentes') rows = rows.filter((row) => ACTIVE_STATUSES.includes(row.status) && !TRANSIT_STATUSES.includes(row.status))
    if (pipeline === 'transito') rows = rows.filter((row) => TRANSIT_STATUSES.includes(row.status))
    if (pipeline === 'concluidas') rows = rows.filter((row) => CLOSED_STATUSES.includes(row.status))
    if (pipeline === 'canceladas') rows = rows.filter((row) => CANCELLED_STATUSES.includes(row.status))
    if (priority !== 'all') rows = rows.filter((row) => row.prioridade === priority)
    return rows
  }, [filteredRemocoes, pipeline, priority])

  const activeRows = useMemo(
    () => visibleRemocoes.filter(isActive).sort((a, b) => {
      if (isCritical(a) !== isCritical(b)) return isCritical(a) ? -1 : 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }),
    [visibleRemocoes],
  )
  const mapRemocao = activeRows.find((row) => TRANSIT_STATUSES.includes(row.status)) || activeRows[0] || null
  const criticalCount = remocoes.filter((row) => isActive(row) && isCritical(row)).length
  const waitingRows = remocoes.filter((row) => isActive(row) && !TRANSIT_STATUSES.includes(row.status))
  const averageWait = waitingRows.length
    ? Math.round(waitingRows.reduce((sum, row) => sum + elapsedMinutes(row.created_at), 0) / waitingRows.length)
    : null
  const delayedCount = waitingRows.filter((row) => elapsedMinutes(row.created_at) >= 15).length
  const pipelineCounts = {
    todas: remocoes.length,
    pendentes: remocoes.filter((row) => ACTIVE_STATUSES.includes(row.status) && !TRANSIT_STATUSES.includes(row.status)).length,
    transito: remocoes.filter((row) => TRANSIT_STATUSES.includes(row.status)).length,
    concluidas: remocoes.filter((row) => CLOSED_STATUSES.includes(row.status)).length,
    canceladas: remocoes.filter((row) => CANCELLED_STATUSES.includes(row.status)).length,
  }

  const updateSearch = (value: string) => {
    setSearch(value)
    setFilter({ search: value })
  }
  const resetFilters = () => {
    setSearch('')
    setFilter({ search: '', status: 'all', prioridade: 'all', finalidade: 'all' })
    setPriority('all')
    setPipeline('todas')
  }

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page space-y-5">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="remocao-eyebrow">GESTÃO DE REMOÇÃO ALPHA · OPERAÇÕES</p>
            <h1 className="remocao-page__title">Central de Despacho</h1>
            <p className="remocao-page__subtitle">Fila operacional, disponibilidade da frota e acompanhamento de transportes autorizados.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => { refetch(); setRefreshKey((value) => value + 1) }} disabled={loading || fleetLoading} className="remocao-btn remocao-btn--secondary">
              <RefreshCw size={15} className={loading || fleetLoading ? 'animate-spin' : ''} /> Atualizar dados
            </button>
            {canCreateRemocao && <Link to="/nova-remocao" className="remocao-btn remocao-btn--primary"><Plus size={17} /> Nova remoção</Link>}
          </div>
        </header>

        {error && <div className="remocao-alert remocao-alert--danger" role="alert"><AlertTriangle size={16} className="mr-2 inline" />Falha ao carregar as remoções: {error}</div>}
        {fleetError && <div className="remocao-alert remocao-alert--warning" role="status"><AlertTriangle size={16} className="mr-2 inline" />{fleetError} Os indicadores de frota estão indisponíveis; tente atualizar.</div>}

        <section aria-label="Indicadores operacionais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Viaturas disponíveis" value={fleetLoading ? '—' : fleet.available} detail={fleetLoading ? 'Consultando frota…' : `De ${fleet.total} veículos cadastrados`} icon={Truck} tone="success" />
          <MetricCard label="Em transporte" value={loading ? '—' : pipelineCounts.transito} detail="Remoções em deslocamento, chegada ou retorno" icon={Ambulance} tone="info" />
          <MetricCard label="Espera média atual" value={loading ? '—' : averageWait === null ? '0 min' : durationLabel(averageWait)} detail="Média da espera das solicitações ainda não em trânsito" icon={Clock3} tone={averageWait !== null && averageWait >= 15 ? 'warning' : 'neutral'} />
          <MetricCard label="Críticas ativas" value={loading ? '—' : criticalCount} detail="Emergenciais ou com intercorrência" icon={ShieldAlert} tone={criticalCount ? 'danger' : 'success'} />
          <MetricCard label="Espera ≥ 15 min" value={loading ? '—' : delayedCount} detail="Alerta operacional de fila, não SLA contratual" icon={AlertTriangle} tone={delayedCount ? 'warning' : 'neutral'} />
        </section>

        <section className="rounded-xl border border-border bg-card p-3 sm:p-4" aria-label="Filtros da central">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etapa da remoção">
              {([
                ['todas', 'Todas'],
                ['pendentes', 'Pendentes'],
                ['transito', 'Em trânsito'],
                ['concluidas', 'Concluídas'],
                ['canceladas', 'Canceladas / não realizadas'],
              ] as [PipelineFilter, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setPipeline(key)} aria-pressed={pipeline === key}
                  className={clsx('rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    pipeline === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  {label}<span className="ml-2 tabular-nums opacity-75">{pipelineCounts[key]}</span>
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1 sm:min-w-[250px]">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Buscar remoção</span>
                <input value={search} onChange={(event) => updateSearch(event.target.value)} className="remocao-input pl-9 pr-9" placeholder="Paciente, número ou motorista" />
                {search && <button type="button" aria-label="Limpar busca" onClick={() => updateSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">×</button>}
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Prioridade</span>
                <select className="remocao-input min-w-[145px]" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                  <option value="all">Todas</option>
                  <option value="emergencial">Emergência</option>
                  <option value="urgente">Urgente</option>
                  <option value="rotina">Rotina / eletiva</option>
                </select>
              </label>
              {(search || priority !== 'all' || pipeline !== 'todas' || filter.status !== 'all') && <button type="button" onClick={resetFilters} className="remocao-btn remocao-btn--ghost remocao-btn--sm">Limpar filtros</button>}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 items-start gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col justify-between gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-bold text-foreground">Fila de despacho</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{visibleRemocoes.length} registros correspondem aos filtros</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Activity size={14} /> Atualização por consulta e eventos disponíveis</span>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 p-8 text-sm text-muted-foreground" role="status"><span className="remocao-spinner" />Carregando a fila operacional…</div>
            ) : visibleRemocoes.length ? (
              <FilaOperacional remocoes={visibleRemocoes} onRemocaoClick={(row) => setSelectedRemocao(row)} />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground"><CheckCircle2 size={23} /></span>
                <h3 className="text-base font-semibold text-foreground">{pipeline === 'todas' && !search && priority === 'all' ? 'Nenhuma remoção registrada neste contexto' : 'Nenhuma remoção corresponde aos filtros'}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{pipeline === 'todas' && !search && priority === 'all' ? 'A consulta foi concluída sem retornar registros para a organização e as permissões atuais. Isso não representa falha de carregamento.' : 'Ajuste a etapa, a prioridade ou a busca para localizar outras solicitações.'}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {canCreateRemocao && <Link to="/nova-remocao" className="remocao-btn remocao-btn--primary"><Plus size={16} /> Nova remoção</Link>}
                  {(search || priority !== 'all' || pipeline !== 'todas') && <button type="button" onClick={resetFilters} className="remocao-btn remocao-btn--secondary">Limpar filtros</button>}
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0 space-y-4" aria-label="Situação tática">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Acompanhamento GPS</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Última posição recebida da remoção selecionada</p>
                </div>
                <MapPin size={17} className="mt-0.5 text-primary" />
              </div>
              {mapRemocao ? (
                <div className="p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">#{mapRemocao.numero} · {mapRemocao.paciente_nome}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{mapRemocao.origem_unidade_nome || 'Origem não informada'} <ArrowRight size={12} className="mx-1 inline" /> {mapRemocao.destino_unidade_nome || mapRemocao.destino_endereco || 'Destino não informado'}</p>
                    </div>
                    <Link to={`/remocao/${mapRemocao.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">Detalhes</Link>
                  </div>
                  <GPSMap remocaoId={mapRemocao.id} height="h-64" />
                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Motorista</p><p className="mt-1 truncate text-sm font-medium text-foreground">{mapRemocao.motorista_nome || 'Não atribuído'}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Viatura</p><p className="mt-1 text-sm font-medium text-foreground">{mapRemocao.veiculo_placa || 'Não atribuída'}</p></div>
                    <div className="col-span-2 flex items-start gap-2 border-t border-border pt-2 text-xs leading-5 text-muted-foreground"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> ETA de rota não disponível: a integração com provedor de roteamento ainda não está configurada. Não exibimos estimativas inventadas.</div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
                  <MapPin size={26} className="text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">Nenhuma remoção ativa para acompanhar</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Quando houver uma solicitação ativa, sua última posição GPS aparecerá aqui, se disponível.</p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2"><Truck size={17} className="text-primary" /><h2 className="text-sm font-bold text-foreground">Resumo da frota</h2></div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Disponíveis</span><strong className="tabular-nums text-emerald-600">{fleetLoading ? '—' : fleet.available}</strong></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: fleet.total ? `${fleet.available / fleet.total * 100}%` : '0%' }} /></div>
                <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Ocupadas</span><strong className="tabular-nums text-primary">{fleetLoading ? '—' : fleet.active}</strong></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: fleet.total ? `${fleet.active / fleet.total * 100}%` : '0%' }} /></div>
                <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{fleetLoading ? 'Consultando cadastro de veículos…' : `${fleet.total - fleet.available - fleet.active} veículo(s) em manutenção, indisponíveis ou com outra situação.`}</p>
              </div>
            </section>

            <section className={clsx('rounded-xl border p-4', criticalCount ? 'border-destructive/30 bg-destructive/[0.035]' : 'border-border bg-card')}>
              <div className="flex items-center gap-2"><ShieldAlert size={17} className={criticalCount ? 'text-destructive' : 'text-muted-foreground'} /><h2 className="text-sm font-bold text-foreground">Prioridade clínica</h2></div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{loading ? '—' : criticalCount}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{criticalCount ? 'Solicitações emergenciais ou com intercorrência exigem revisão imediata pela equipe responsável.' : 'Nenhuma solicitação emergencial ou com intercorrência identificada na lista carregada.'}</p>
              {criticalCount > 0 && <button type="button" onClick={() => { setPriority('emergencial'); setPipeline('todas') }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline">Ver emergenciais <ArrowDownRight size={13} /></button>}
            </section>
          </aside>
        </section>
      </div>
    </div>
  )
}
