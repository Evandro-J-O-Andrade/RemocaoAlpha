import { useEffect, useState } from 'react'
import { Building2, RefreshCw, ShieldCheck, AlertTriangle, MapPin } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

const PAGE_SIZE = 10

interface TenantRow {
  id: string
  nome: string
  razao_social: string | null
  cnpj: string | null
  email: string | null
  ativo: boolean
  created_at: string
}

interface UnitRow {
  id: string
  tenant_id: string
  nome: string
  ativo?: boolean | null
  cidade?: string | null
  municipio?: string | null
  uf?: string | null
  endereco?: string | null
  [key: string]: unknown
}

export function GlobalAdministrationPage() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [units, setUnits] = useState<UnitRow[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.is_root) {
        setTenants([])
        setUnits([])
        setTotal(0)
        setLoading(false)
        setError('A Administração Global está disponível exclusivamente para ROOT.')
        return
      }

      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('tenants')
          .select('id, nome, razao_social, cnpj, email, ativo, created_at', { count: 'exact' })
          .order('nome', { ascending: true })
        if (search.trim()) query = query.ilike('nome', `%${search.trim()}%`)
        const { data, error: tenantError, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (tenantError) throw tenantError

        const tenantRows = (data || []) as TenantRow[]
        let unitRows: UnitRow[] = []
        if (tenantRows.length) {
          const { data: unitData, error: unitError } = await supabase
            .from('remocao_unidade')
            .select('*')
            .in('tenant_id', tenantRows.map((tenant) => tenant.id))
            .order('nome', { ascending: true })
          if (unitError) throw unitError
          unitRows = (unitData || []) as UnitRow[]
        }

        if (!cancelled) {
          setTenants(tenantRows)
          setUnits(unitRows)
          setTotal(count || 0)
        }
      } catch (cause) {
        if (cancelled) return
        const value = cause as { message?: string; code?: string }
        setError(value?.message
          ? `Não foi possível carregar a visão global: ${value.message}${value.code ? ` (${value.code})` : ''}`
          : 'Não foi possível carregar a visão global. Tente novamente.')
        setTenants([])
        setUnits([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [user?.is_root, search, page, retryKey])

  if (!user?.is_root) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-alert remocao-alert--danger" role="alert">Acesso negado. Esta área é exclusiva para ROOT global.</div>
        </div>
      </div>
    )
  }

  const activeOnPage = tenants.filter((tenant) => tenant.ativo).length
  const unitCount = units.length

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <header className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">CONTROLE DA PLATAFORMA</p>
            <h1 className="remocao-page__title">Administração Global</h1>
            <p className="remocao-page__subtitle">Visão consolidada dos tenants e das unidades cadastradas, baseada nos dados reais do Supabase.</p>
          </div>
          <button type="button" className="remocao-btn remocao-btn--secondary" onClick={() => setRetryKey((current) => current + 1)} disabled={loading}>
            <RefreshCw size={15} /> Atualizar
          </button>
        </header>

        {error && <div className="remocao-alert remocao-alert--danger mb-4" role="alert"><AlertTriangle size={16} className="inline mr-2" />{error}</div>}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <section className="remocao-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 size={16} /> Tenants encontrados</div>
            <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total para o filtro atual</p>
          </section>
          <section className="remocao-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} /> Ativos nesta página</div>
            <p className="mt-2 text-2xl font-bold text-foreground">{activeOnPage}</p>
            <p className="mt-1 text-xs text-muted-foreground">De até {PAGE_SIZE} registros visíveis</p>
          </section>
          <section className="remocao-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={16} /> Unidades nesta página</div>
            <p className="mt-2 text-2xl font-bold text-foreground">{unitCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Associadas aos tenants exibidos</p>
          </section>
        </div>

        <section className="remocao-card mb-4 p-4">
          <div className="remocao-field max-w-md">
            <label htmlFor="global-tenant-search">Buscar instituição</label>
            <input id="global-tenant-search" type="search" className="remocao-input" value={search} placeholder="Nome do tenant…" onChange={(event) => { setSearch(event.target.value); setPage(0) }} />
          </div>
        </section>

        <section className="remocao-card p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-semibold text-foreground">Instituições e unidades</h2>
            <span className="text-sm text-muted-foreground" aria-live="polite">{loading ? 'Carregando…' : `${total} tenants`}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Consultando tenants e unidades…</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-foreground">Nenhuma instituição encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Altere a pesquisa ou verifique os dados e as permissões do banco.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="remocao-table min-w-full">
                <thead><tr><th>Instituição</th><th>CNPJ</th><th>Contato</th><th>Unidades</th><th>Status</th><th>Criada em</th></tr></thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const tenantUnits = units.filter((unit) => unit.tenant_id === tenant.id)
                    return (
                      <tr key={tenant.id}>
                        <td>
                          <span className="remocao-table__primary">{tenant.nome}</span>
                          <span className="remocao-table__secondary">{tenant.razao_social || tenant.id}</span>
                        </td>
                        <td>{tenant.cnpj || '—'}</td>
                        <td>{tenant.email || '—'}</td>
                        <td>
                          {tenantUnits.length ? (
                            <ul className="space-y-1">
                              {tenantUnits.map((unit) => {
                                const location = [unit.cidade || unit.municipio, unit.uf].filter(Boolean).join(' - ')
                                return <li key={unit.id} className="text-xs"><span className="font-medium">{unit.nome}</span><span className="text-muted-foreground"> · {location || unit.endereco || 'Localização não informada'}</span></li>
                              })}
                            </ul>
                          ) : '—'}
                        </td>
                        <td><span className="remocao-status">{tenant.ativo ? 'Ativo' : 'Inativo'}</span></td>
                        <td>{new Date(tenant.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">{total ? `Exibindo ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} de ${total}` : 'Nenhum registro'}</span>
            <div className="flex gap-2">
              <button type="button" className="remocao-btn remocao-btn--secondary remocao-btn--sm" disabled={page === 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))}>Anterior</button>
              <button type="button" className="remocao-btn remocao-btn--secondary remocao-btn--sm" disabled={loading || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)}>Próxima</button>
            </div>
          </footer>
        </section>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Esta página consulta registros reais e não executa mutações administrativas diretas. Criação, edição e suspensão de tenants só devem ser habilitadas após validar as RPCs transacionais e as políticas de autorização do banco.
        </p>
      </div>
    </div>
  )
}
