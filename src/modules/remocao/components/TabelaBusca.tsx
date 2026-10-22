import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type Catalogo = 'sigtap' | 'cid10' | 'cbo'

function useTabelaBusca(tabela: Catalogo, query: string) {
  const [resultados, setResultados] = useState<any[]>([])
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
        const q = `%${query.trim()}%`
        let request
        if (tabela === 'cid10') {
          request = supabase.from('cid10').select('codigo, descricao').or(`codigo.ilike.${q},descricao.ilike.${q}`).limit(20)
        } else if (tabela === 'cbo') {
          request = supabase.from('cbo_ocupacoes').select('codigo, titulo').or(`codigo.ilike.${q},titulo.ilike.${q}`).limit(20)
        } else {
          request = supabase.from('sigtap_procedimentos').select('codigo, nome, valor_total, competencia').or(`codigo.ilike.${q},nome.ilike.${q}`).order('competencia', { ascending: false }).limit(20)
        }
        const { data, error: queryError } = await request
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          setResultados([])
        } else {
          setResultados(data || [])
        }
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Falha na consulta.')
        setResultados([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [tabela, query])

  return { resultados, loading, error }
}

export function Cid10Select({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados, loading, error } = useTabelaBusca('cid10', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">CID-10 (para exame externo e faturamento)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Digite CID ou descricao - ex: J18.9 ou Pneumonia"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-yellow-400 outline-none"
      />
      {loading && <p className="text-[11px] text-slate-500 mt-1">Consultando...</p>}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button
              key={r.codigo}
              type="button"
              onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.descricao) }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-white"
            >
              <span className="font-mono text-yellow-400">{r.codigo}</span> - {r.descricao}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte oficial DATASUS CID-10</p>
    </div>
  )
}

export function SigtapSelect({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados, loading, error } = useTabelaBusca('sigtap', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">SIGTAP - Procedimento SUS (para exame externo e faturamento)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ex: 0205020038 ou ULTRASSOM ABDOMEN"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-yellow-400 outline-none"
      />
      {loading && <p className="text-[11px] text-slate-500 mt-1">Consultando...</p>}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button
              key={`${r.codigo}-${r.competencia}`}
              type="button"
              onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.nome) }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm"
            >
              <span className="font-mono text-emerald-400">{r.codigo}</span> - <span className="text-white">{r.nome}</span> - <span className="text-slate-400">R$ {r.valor_total}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte: SIGTAP (DATASUS)</p>
    </div>
  )
}

export function CboSelect({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados, loading, error } = useTabelaBusca('cbo', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">CBO - Classificacao Brasileira de Ocupacoes (para equipe)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ex: 515135 Socorrista, 223505 Enfermeiro, 225125 Medico clinico"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm"
      />
      {loading && <p className="text-[11px] text-slate-500 mt-1">Consultando...</p>}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button key={r.codigo} type="button" onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.titulo) }} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-white">
              <span className="font-mono text-blue-400">{r.codigo}</span> - {r.titulo}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte: CBO (MTE)</p>
    </div>
  )
}

export function ExameExternoForm() {
  const [cid, setCid] = useState<any>(null)
  const [sigtap, setSigtap] = useState<any>(null)

  return (
    <div className="space-y-4 p-4 bg-[#020617] border border-white/5 rounded-2xl">
      <h3 className="font-bold text-white">Exame Externo - Vincula CID-10 + SIGTAP + CBO</h3>
      <p className="text-xs text-slate-400">Quando paciente vai pra exame externo (UBS - Hospital - Clinica), precisa CID (por que faz) + SIGTAP (o que faz) + CBO (quem faz)</p>

      <Cid10Select onChange={setCid} />
      <SigtapSelect onChange={setSigtap} />

      {cid && sigtap && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
          <strong>Faturamento OK:</strong> CID {cid.codigo} permite SIGTAP {sigtap.codigo}. Valor estimado R$ {sigtap.valor_total ?? sigtap.valor}
        </div>
      )}
    </div>
  )
}
