import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

type Catalogo = 'cid10' | 'sigtap' | 'cbo'

function filtroIlike(valor: string) {
  const padrao = `%${valor.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%`
  return `"${padrao}"`
}

export interface CatalogoItem {
  codigo: string
  descricao?: string
  titulo?: string
  nome?: string
  competencia?: string
  valor_total?: number
}

interface CatalogoSearchModalProps {
  open: boolean
  onClose: () => void
  catalogo: Catalogo
  onSelect: (item: CatalogoItem) => void
  titulo?: string
}

const PAGE_SIZE = 20

const LABELS: Record<Catalogo, { titulo: string; placeholder: string; coluna: string }> = {
  cid10: { titulo: 'Localizar no catálogo CID-10', placeholder: 'Código ou descrição...', coluna: 'descricao' },
  cbo: { titulo: 'Localizar no catálogo CBO', placeholder: 'Código ou ocupação...', coluna: 'titulo' },
  sigtap: { titulo: 'Localizar no catálogo SIGTAP', placeholder: 'Código ou procedimento...', coluna: 'nome' },
}

function getDisplayText(item: CatalogoItem, catalogo: Catalogo): string {
  if (catalogo === 'cid10') return item.descricao || ''
  if (catalogo === 'cbo') return item.titulo || ''
  return item.nome || ''
}

function getSelectColumn(catalogo: Catalogo): string {
  if (catalogo === 'cid10') return 'codigo, descricao'
  if (catalogo === 'cbo') return 'codigo, titulo'
  return 'codigo, nome, valor_total, competencia'
}

export function CatalogoSearchModal({ open, onClose, catalogo, onSelect, titulo }: CatalogoSearchModalProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<CatalogoItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const labels = LABELS[catalogo]

  const fetchPage = useCallback(async (q: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const selectCols = getSelectColumn(catalogo)
      const tableName = catalogo === 'cid10' ? 'cid10' : catalogo === 'cbo' ? 'cbo_ocupacoes' : 'sigtap_procedimentos'
      const descCol = catalogo === 'cid10' ? 'descricao' : catalogo === 'cbo' ? 'titulo' : 'nome'

      let request = supabase.from(tableName).select(selectCols, { count: 'exact' })

      if (q.trim().length >= 1) {
        const term = filtroIlike(q.trim())
        request = request.or(`codigo.ilike.${term},${descCol}.ilike.${term}`)
      }

      if (catalogo === 'sigtap') {
        request = request.order('competencia', { ascending: false }).order('codigo')
      } else {
        request = request.order('codigo')
      }

      request = request.range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

      const { data, error: queryError, count } = await request
      if (queryError) {
        setError(queryError.message)
        setItems([])
        setTotal(0)
        return
      }
      setItems((data || []) as unknown as CatalogoItem[])
      setTotal(count || 0)
      setHighlighted(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na consulta.')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [catalogo])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setPage(0)
    fetchPage('', 0)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [open, fetchPage])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      setPage(0)
      fetchPage(query, 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, open, fetchPage])

  useEffect(() => {
    if (!open) return
    fetchPage(query, page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, items.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    }
    if (e.key === 'Enter' && items.length > 0) {
      e.preventDefault()
      onSelect(items[highlighted])
      onClose()
    }
  }

  if (!open) return null

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold text-white text-lg">{titulo || labels.titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={labels.placeholder}
              className="w-full pl-10 pr-4 py-3 bg-[#020617] border border-white/10 rounded-xl text-sm text-white focus:border-yellow-400 outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {total > 0 ? `${total} registros encontrados` : loading ? 'Consultando...' : 'Nenhum registro'}
          </p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto min-h-[200px]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-yellow-400" />
            </div>
          )}
          {error && (
            <div className="p-4 text-red-400 text-sm">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhum resultado encontrado.</div>
          )}
          {!loading && items.map((item, idx) => (
            <button
              key={`${item.codigo}-${item.competencia || ''}`}
              type="button"
              onClick={() => { onSelect(item); onClose() }}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition flex items-center gap-3 ${idx === highlighted ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <span className="font-mono text-yellow-400 text-sm min-w-[100px]">{item.codigo}</span>
              <span className="text-white text-sm flex-1 truncate">{getDisplayText(item, catalogo)}</span>
              {catalogo === 'sigtap' && item.valor_total !== undefined && (
                <span className="text-slate-400 text-xs">R$ {item.valor_total}</span>
              )}
              {catalogo === 'sigtap' && item.competencia && (
                <span className="text-slate-500 text-xs">{item.competencia}</span>
              )}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 text-sm text-slate-300 disabled:opacity-30 hover:text-white transition"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span className="text-xs text-slate-500">Página {page + 1} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-sm text-slate-300 disabled:opacity-30 hover:text-white transition"
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CatalogoSearchModal
