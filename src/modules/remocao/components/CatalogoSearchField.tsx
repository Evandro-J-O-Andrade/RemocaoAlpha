import { useState } from 'react'
import { Search } from 'lucide-react'
import { CatalogoSearchModal } from './CatalogoSearchModal'
import type { CatalogoItem } from './CatalogoSearchModal'

type Catalogo = 'cid10' | 'sigtap' | 'cbo'

interface CatalogoSearchFieldProps {
  catalogo: Catalogo
  value?: { codigo: string; descricao: string } | null
  onChange: (item: CatalogoItem | null) => void
  label?: string
  placeholder?: string
  className?: string
}

export function CatalogoSearchField({ catalogo, value, onChange, label, placeholder, className }: CatalogoSearchFieldProps) {
  const [open, setOpen] = useState(false)

  const displayValue = value ? `${value.codigo} - ${value.descricao}` : ''

  return (
    <div className={className}>
      {label && <label className="text-xs text-slate-400 block mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          value={displayValue}
          readOnly
          placeholder={placeholder || 'Selecione...'}
          className="flex-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Pesquisar no catálogo"
        >
          <Search size={18} />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Limpar seleção"
          >
            <span className="text-xs">✕</span>
          </button>
        )}
      </div>
      <CatalogoSearchModal
        open={open}
        onClose={() => setOpen(false)}
        catalogo={catalogo}
        onSelect={(item) => {
          const desc = catalogo === 'cid10' ? item.descricao : catalogo === 'cbo' ? item.titulo : item.nome
          onChange({ codigo: item.codigo, descricao: desc || '' })
        }}
      />
    </div>
  )
}

export default CatalogoSearchField
