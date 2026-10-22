import { useEffect, useState } from 'react'
import { DestinosExternosRepository, type DestinoExterno } from '@/modules/remocao/repositories/destinosExternosRepository'

interface Props {
  tenantId: string
  value: string | null
  onChange: (id: string | null, destino?: DestinoExterno) => void
}

export function DestinoExternoPicker({ tenantId, value, onChange }: Props) {
  const [items, setItems] = useState<DestinoExterno[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    void DestinosExternosRepository.list(tenantId, search || undefined).then(({ data }) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [tenantId, search])

  return (
    <div className="remocao-field">
      <label>Destino externo</label>
      <input
        type="search"
        placeholder="Buscar destino..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="remocao-input"
      />
      <select
        value={value || ''}
        onChange={(e) => {
          const sel = items.find((i) => i.id === e.target.value)
          onChange(e.target.value || null, sel)
        }}
        disabled={loading}
        className="remocao-input"
      >
        <option value="">— Selecione —</option>
        {items.map((d) => (
          <option key={d.id} value={d.id}>{d.nome} — {d.cidade || ''}</option>
        ))}
      </select>
    </div>
  )
}
