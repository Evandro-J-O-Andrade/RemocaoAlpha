import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import type { RemocaoDashboardView, RemocaoSummary, StatusRemocao } from '@/modules/remocao/types'
import { useRemocoesQuery } from '@/modules/remocao/hooks/useRemocoes'
import { useRealtimeSubscriptions } from '@/modules/remocao/hooks/useRealtimeSubscriptions'
import { useAuth } from '@/app/providers/AuthProvider'

interface RemocaoContextType {
  remocoes: RemocaoDashboardView[]
  filteredRemocoes: RemocaoDashboardView[]
  loading: boolean
  error: string | null
  summary: RemocaoSummary
  filter: RemocaoFilter
  setFilter: (filter: Partial<RemocaoFilter>) => void
  refetch: () => void
  selectedRemocao: RemocaoDashboardView | null
  setSelectedRemocao: (r: RemocaoDashboardView | null) => void
}

export interface RemocaoFilter {
  search: string
  status: StatusRemocao | 'all'
  prioridade: 'rotina' | 'urgente' | 'emergencial' | 'all'
  finalidade: string | 'all'
  data_inicio: string
  data_fim: string
}

const RemocaoContext = createContext<RemocaoContextType | undefined>(undefined)

export function RemocaoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { remocoes, loading, error, summary, refetch } = useRemocoesQuery(user?.tenant_id || '')

  // Subscribe to realtime updates
  useRealtimeSubscriptions()

  // Simple in-memory filter state
  const [filter, setFilterState] = useState<RemocaoFilter>({
    search: '',
    status: 'all',
    prioridade: 'all',
    finalidade: 'all',
    data_inicio: '',
    data_fim: '',
  })
  const [selectedRemocao, setSelectedRemocao] = useState<RemocaoDashboardView | null>(null)

  const setFilter = (partial: Partial<RemocaoFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }))
  }

  const filteredRemocoes = useMemo(() => {
    return remocoes.filter((r) => {
      const searchMatch = !filter.search ||
        r.paciente_nome.toLowerCase().includes(filter.search.toLowerCase()) ||
        r.numero.toLowerCase().includes(filter.search.toLowerCase()) ||
        (r.motorista_nome || '').toLowerCase().includes(filter.search.toLowerCase())

      const statusMatch = filter.status === 'all' || r.status === filter.status
      const prioridadeMatch = filter.prioridade === 'all' || r.prioridade === filter.prioridade
      const finalidadeMatch = filter.finalidade === 'all' || r.finalidade === filter.finalidade

      return searchMatch && statusMatch && prioridadeMatch && finalidadeMatch
    })
  }, [remocoes, filter])

  return (
    <RemocaoContext.Provider
      value={{
        remocoes,
        filteredRemocoes,
        loading,
        error,
        summary,
        filter,
        setFilter,
        refetch,
        selectedRemocao,
        setSelectedRemocao,
      }}
    >
      {children}
    </RemocaoContext.Provider>
  )
}

export const useRemocao = () => {
  const context = useContext(RemocaoContext)
  if (!context) throw new Error('useRemocao must be used within RemocaoProvider')
  return context
}
