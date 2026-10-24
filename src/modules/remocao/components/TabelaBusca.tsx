import { useEffect, useState } from 'react'
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Catalogo = 'sigtap' | 'cid10' | 'cbo'
type Registro = { codigo: string; descricao?: string; titulo?: string; nome?: string; valor_total?: number | string | null; competencia?: string }

const PAGE_SIZE = 20

// Valores de texto podem conter vírgulas, parênteses e outros caracteres que
// fazem parte da sintaxe do operador .or() do PostgREST. Colocar o padrão entre
// aspas impede que a descrição do catálogo seja interpretada como lógica.
function filtroIlike(valor: string) {
  const padrao = `%${valor.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%`
  return `"${padrao}"`
}

function catalogoConfig(tabela: Catalogo) {
  if (tabela === 'cid10') return { titulo: 'Catálogo CID-10', tabela: 'cid10', colunas: 'codigo, descricao', nome: 'descricao', fonte: 'DATASUS · CID-10' }
  if (tabela === 'cbo') return { titulo: 'Catálogo CBO', tabela: 'cbo_ocupacoes', colunas: 'codigo, titulo', nome: 'titulo', fonte: 'Classificação Brasileira de Ocupações' }
  return { titulo: 'Catálogo SIGTAP', tabela: 'sigtap_procedimentos', colunas: 'codigo, nome, valor_total, competencia', nome: 'nome', fonte: 'SIGTAP · DATASUS' }
}

function textoRegistro(tabela: Catalogo, r: Registro) {
  const nome = tabela === 'cid10' ? r.descricao : tabela === 'cbo' ? r.titulo : r.nome
  return [r.codigo, nome].filter(Boolean).join(' - ')
}

function useTabelaBusca(tabela: Catalogo, query: string) {
  const [resultados, setResultados] = useState<Registro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const q = filtroIlike(query)
        const config = catalogoConfig(tabela)
        let request: any = supabase.from(config.tabela).select(config.colunas)
        if (tabela === 'cid10') request = request.or(`codigo.ilike.${q},descricao.ilike.${q}`)
        else if (tabela === 'cbo') request = request.or(`codigo.ilike.${q},titulo.ilike.${q}`)
        else request = request.or(`codigo.ilike.${q},nome.ilike.${q}`).order('competencia', { ascending: false })
        const { data, error: queryError } = await request.limit(20)
        if (cancelled) return
        if (queryError) { setError(queryError.message); setResultados([]) }
        else setResultados((data || []) as Registro[])
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : 'Falha na consulta.'); setResultados([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [tabela, query])

  return { resultados, loading, error }
}

function CatalogoModal({ tabela, onSelect, onClose }: { tabela: Catalogo; onSelect: (r: Registro) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [resultados, setResultados] = useState<Registro[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const config = catalogoConfig(tabela)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { setPage(0) }, [query])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let request: any = supabase.from(config.tabela).select(config.colunas, { count: 'exact' })
        const term = query.trim()
        if (term) {
          const q = `%${term}%`
          if (tabela === 'cid10') request = request.or(`codigo.ilike.${q},descricao.ilike.${q}`)
          else if (tabela === 'cbo') request = request.or(`codigo.ilike.${q},titulo.ilike.${q}`)
          else request = request.or(`codigo.ilike.${q},nome.ilike.${q}`)
        }
        if (tabela === 'sigtap') request = request.order('competencia', { ascending: false }).order('codigo', { ascending: true })
        else request = request.order('codigo', { ascending: true })
        const { data, count, error: queryError } = await request.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
        if (cancelled) return
        if (queryError) { setError(queryError.message); setResultados([]); setTotal(0) }
        else { setResultados((data || []) as Registro[]); setTotal(count || 0) }
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar o catálogo.'); setResultados([]); setTotal(0) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [tabela, query, page, config.tabela, config.colunas])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`catalogo-${tabela}-titulo`} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div>
            <h2 id={`catalogo-${tabela}-titulo`} className="text-lg font-bold">{config.titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pesquise por código ou descrição, ou navegue pelo catálogo completo.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar catálogo" className="rounded-md p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={18} /></button>
        </header>
        <div className="border-b border-border p-4">
          <label htmlFor={`catalogo-${tabela}-busca`} className="mb-1.5 block text-sm font-medium">Código ou descrição</label>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input id={`catalogo-${tabela}-busca`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite para filtrar; deixe vazio para navegar por tudo" className="catalogo-modal-input min-h-11 w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" autoFocus />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> Carregando catálogo…</div>
            : error ? <div role="alert" className="p-6 text-sm text-destructive">Não foi possível consultar o catálogo: {error}</div>
            : resultados.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado para este filtro.</div>
            : <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Descrição</th>{tabela === 'sigtap' && <th className="px-4 py-3 text-right">Valor</th>}<th className="px-4 py-3 text-right">Ação</th></tr></thead>
              <tbody>{resultados.map((r, i) => <tr key={`${r.codigo}-${r.competencia || ''}-${i}`} className="border-t border-border hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{r.codigo}</td>
                <td className="min-w-[220px] px-4 py-3">{tabela === 'cid10' ? r.descricao : tabela === 'cbo' ? r.titulo : r.nome}{tabela === 'sigtap' && r.competencia && <span className="mt-1 block text-xs text-muted-foreground">Competência {r.competencia}</span>}</td>
                {tabela === 'sigtap' && <td className="whitespace-nowrap px-4 py-3 text-right">{r.valor_total == null ? '—' : Number(r.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>}
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => onSelect(r)} className="rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">Selecionar</button></td>
              </tr>)}</tbody>
            </table>}
        </div>
        <footer className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{total.toLocaleString('pt-BR')} registros · Página {Math.min(page + 1, totalPages)} de {totalPages} · {config.fonte}</span>
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
            <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Próxima <ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function CatalogoSelect({ tabela, label, placeholder, value, onTextChange, onChange }: { tabela: Catalogo; label: string; placeholder: string; value?: string; onTextChange?: (value: string) => void; onChange: (r: Registro) => void }) {
  const [query, setQuery] = useState(value || '')
  useEffect(() => { if (value !== undefined) setQuery(current => current === value ? current : value) }, [value])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectionCommitted, setSelectionCommitted] = useState(false)
  // Depois de selecionar, mantém o código/descrição visível sem disparar nova
  // busca com o texto completo. A digitação seguinte reativa o autocomplete.
  const { resultados, loading, error } = useTabelaBusca(tabela, selectionCommitted ? '' : query)

  const select = (r: Registro) => {
    const text = textoRegistro(tabela, r)
    onChange(r)
    onTextChange?.(text)
    setQuery(text)
    setSelectionCommitted(true)
    setModalOpen(false)
  }

  return (
    <div className="relative min-w-0">
      <label className="mb-1 block text-xs font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <input value={query} onChange={e => { setSelectionCommitted(false); setQuery(e.target.value); onTextChange?.(e.target.value) }} placeholder={placeholder} className="catalogo-select-input mt-1 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <button type="button" onClick={() => setModalOpen(true)} title={`Pesquisar no catálogo completo: ${label}`} aria-label={`Pesquisar no catálogo completo: ${label}`} className="mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Search size={18} /></button>
      </div>
      {loading && <p className="mt-1 text-xs text-muted-foreground">Consultando sugestões…</p>}
      {error && <p role="status" className="mt-1 text-xs text-destructive">Falha na sugestão: {error}</p>}
      {resultados.length > 0 && query.trim().length >= 2 && (
        <div className="catalogo-select-suggestions absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card text-foreground shadow-xl">
          {resultados.map(r => <button key={`${r.codigo}-${r.competencia || ''}`} type="button" onClick={() => select(r)} className="catalogo-select-option block w-full border-b border-border bg-card px-3 py-2.5 text-left text-sm text-foreground last:border-0 hover:bg-muted focus-visible:bg-muted">
            <span className="font-mono font-semibold">{r.codigo}</span><span> — {tabela === 'cid10' ? r.descricao : tabela === 'cbo' ? r.titulo : r.nome}</span>{tabela === 'sigtap' && <span className="block text-xs text-muted-foreground">Competência {r.competencia || 'não informada'}{r.valor_total != null ? ` · R$ ${r.valor_total}` : ''}</span>}
          </button>)}
        </div>
      )}
      {modalOpen && <CatalogoModal tabela={tabela} onSelect={select} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export function Cid10Select({ value, onTextChange, onChange }: { value?: string; onTextChange?: (value: string) => void; onChange: (v: any) => void }) {
  return <CatalogoSelect tabela="cid10" label="CID-10 — diagnóstico" placeholder="Digite código ou doença, ex.: J18.9 ou Pneumonia" value={value} onTextChange={onTextChange} onChange={onChange} />
}

export function SigtapSelect({ value: _value, onChange }: { value?: string; onChange: (v: any) => void }) {
  return <CatalogoSelect tabela="sigtap" label="SIGTAP — procedimento / exame" placeholder="Digite código ou exame, ex.: ultrassom de abdome" onChange={onChange} />
}

export function CboSelect({ value: _value, onChange }: { value?: string; onChange: (v: any) => void }) {
  return <CatalogoSelect tabela="cbo" label="CBO — ocupação profissional" placeholder="Digite código ou ocupação, ex.: enfermeiro" onChange={onChange} />
}

export function ExameExternoForm() {
  const [cid, setCid] = useState<Registro | null>(null)
  const [sigtap, setSigtap] = useState<Registro | null>(null)

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-bold text-foreground">Exame externo — CID-10 + SIGTAP</h3>
      <p className="text-sm text-muted-foreground">O CID registra o diagnóstico; o SIGTAP identifica o procedimento. A compatibilidade clínica e de faturamento não é validada automaticamente.</p>
      <Cid10Select onChange={setCid} />
      <SigtapSelect onChange={setSigtap} />
      {cid && sigtap && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground"><strong>Selecionados:</strong> CID {cid.codigo} e SIGTAP {sigtap.codigo}.</div>}
    </div>
  )
}
