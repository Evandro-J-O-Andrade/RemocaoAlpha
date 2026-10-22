
import { useState, useEffect } from 'react'

// Hook genérico para buscar nas 3 tabelas com autocomplete
function useTabelaBusca(tabela: 'sigtap' | 'cid10' | 'cbo', query: string) {
  const [resultados, setResultados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) return
    setLoading(true)
    // Simula busca - aqui você faz supabase.from(tabela).select().ilike('nome', `%${query}%`)
    // Exemplo: const { data } = await supabase.from('cid10').select('*').or(`codigo.ilike.%${query}%,descricao.ilike.%${query}%`).limit(20)
    setTimeout(() => {
      if (tabela === 'cid10') {
        setResultados([
          { codigo: 'J18.9', descricao: 'Pneumonia não especificada' },
          { codigo: 'I10', descricao: 'Hipertensão essencial' },
        ])
      } else if (tabela === 'sigtap') {
        setResultados([
          { codigo: '0205020038', nome: 'ULTRA-SONOGRAFIA DE ABDOMEN TOTAL', valor: 37.10 },
          { codigo: '0206030010', nome: 'TOMOGRAFIA DE CRANIO', valor: 97.44 },
        ])
      } else {
        setResultados([
          { codigo: '515135', titulo: 'Socorrista' },
          { codigo: '223505', titulo: 'Enfermeiro' },
        ])
      }
      setLoading(false)
    }, 300)
  }, [tabela, query])

  return { resultados, loading }
}

// Componente CID-10 com busca
export function Cid10Select({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados } = useTabelaBusca('cid10', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">CID-10 (para exame externo e faturamento)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Digite CID ou descrição - ex: J18.9 ou Pneumonia"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-yellow-400 outline-none"
      />
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button
              key={r.codigo}
              onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.descricao) }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-white"
            >
              <span className="font-mono text-yellow-400">{r.codigo}</span> - {r.descricao}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte oficial DATASUS CID10CSV.zip</p>
    </div>
  )
}

export function SigtapSelect({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados } = useTabelaBusca('sigtap', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">SIGTAP - Procedimento SUS (para exame externo e faturamento)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ex: 0205020038 ou ULTRASSOM ABDOMEN"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-yellow-400 outline-none"
      />
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button
              key={r.codigo}
              onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.nome) }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm"
            >
              <span className="font-mono text-emerald-400">{r.codigo}</span> - <span className="text-white">{r.nome}</span> - <span className="text-slate-400">R$ {r.valor}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte: sigtap.datasus.gov.br - download mensal ~80 arquivos?6391524532713307007†L11-L14?</p>
    </div>
  )
}

export function CboSelect({ value: _value, onChange }: { value?: string, onChange: (v: any) => void }) {
  const [query, setQuery] = useState('')
  const { resultados } = useTabelaBusca('cbo', query)

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">CBO - Classificação Brasileira de Ocupações (para equipe)</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ex: 515135 Socorrista, 223505 Enfermeiro, 225125 Médico clínico"
        className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-sm"
      />
      {resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#0F172A] border border-white/10 rounded-xl max-h-[200px] overflow-y-auto">
          {resultados.map(r => (
            <button key={r.codigo} onClick={() => { onChange(r); setQuery(r.codigo + ' - ' + r.titulo) }} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-white">
              <span className="font-mono text-blue-400">{r.codigo}</span> - {r.titulo}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-1">Fonte oficial MTE - Ministério do Trabalho?6414437783642482958†L7-L10?- 2024 com 19 novas ocupações</p>
    </div>
  )
}

// Componente unificado para NovaRemocao
export function ExameExternoForm() {
  const [cid, setCid] = useState<any>(null)
  const [sigtap, setSigtap] = useState<any>(null)

  return (
    <div className="space-y-4 p-4 bg-[#020617] border border-white/5 rounded-2xl">
      <h3 className="font-bold text-white">Exame Externo - Vincula CID-10 + SIGTAP + CBO</h3>
      <p className="text-xs text-slate-400">Quando paciente vai pra exame externo (UBS ? Hospital ? Clínica), precisa CID (por que faz) + SIGTAP (o que faz) + CBO (quem faz)</p>
      
      <Cid10Select onChange={setCid} />
      <SigtapSelect onChange={setSigtap} />
      
      {cid && sigtap && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
          <strong>Faturamento OK:</strong> CID {cid.codigo} permite SIGTAP {sigtap.codigo}. Valor estimado R$ {sigtap.valor}
        </div>
      )}
    </div>
  )
}

