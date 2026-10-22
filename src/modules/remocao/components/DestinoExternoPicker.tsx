import { useEffect, useState } from 'react'
import { DestinosExternosRepository, type DestinoExterno } from '@/modules/remocao/repositories/destinosExternosRepository'

interface Props {
  tenantId: string
  value: string | null
  onChange: (id: string | null, destino?: DestinoExterno) => void
}

function explainLoadError(error: unknown): string {
  const value = error as { code?: string; status?: number } | null
  if (value?.status === 404 || value?.code === 'PGRST205' || value?.code === '42P01') {
    return 'O cadastro de destinos externos não está disponível no banco remoto. A migration 20261024000000_remocao_destinos_externos.sql precisa ser aplicada ou o schema da API precisa ser atualizado. Você ainda pode informar o endereço manualmente e continuar sem selecionar um destino cadastrado.'
  }
  return 'Não foi possível carregar a lista de destinos externos. Confira a conexão ou informe o endereço manualmente. Se o problema persistir, solicite a verificação do banco à equipe técnica.'
}

export function DestinoExternoPicker({ tenantId, value, onChange }: Props) {
  const [items, setItems] = useState<DestinoExterno[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!tenantId || loadError) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      void DestinosExternosRepository.list(tenantId, search.trim() || undefined)
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) {
            setItems([])
            setLoadError(explainLoadError(error))
            return
          }
          setItems(data || [])
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setItems([])
          setLoadError(explainLoadError(error))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [tenantId, search, loadError, retryKey])

  const retry = () => {
    setLoadError(null)
    setRetryKey((current) => current + 1)
  }

  return (
    <div className="remocao-field">
      <label htmlFor="destino-externo-search">Destino externo</label>
      <input
        id="destino-externo-search"
        type="search"
        placeholder="Buscar destino..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="remocao-input"
        aria-describedby={loadError ? 'destino-externo-error' : undefined}
      />
      <select
        aria-label="Destino externo cadastrado"
        value={value || ''}
        onChange={(e) => {
          const selected = items.find((item) => item.id === e.target.value)
          onChange(e.target.value || null, selected)
        }}
        disabled={loading || Boolean(loadError)}
        className="remocao-input"
      >
        <option value="">— Selecione —</option>
        {items.map((destination) => (
          <option key={destination.id} value={destination.id}>
            {destination.nome}{destination.cidade ? ` — ${destination.cidade}` : ''}
          </option>
        ))}
      </select>
      {loading && <p role="status" className="text-xs text-muted-foreground">Carregando destinos externos…</p>}
      {loadError && (
        <div id="destino-externo-error" role="alert" className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-foreground">
          <p>{loadError}</p>
          <button type="button" onClick={retry} className="mt-2 font-semibold text-primary underline underline-offset-2">
            Tentar carregar novamente
          </button>
        </div>
      )}
      {!loading && !loadError && items.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum destino externo cadastrado para o tenant ativo.</p>
      )}
    </div>
  )
}
