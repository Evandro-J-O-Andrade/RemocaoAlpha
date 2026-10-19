import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RemocaoRepository } from '@/modules/remocao/repositories/remocaoRepository'
import type { RemocaoDashboardView, RemocaoSummary } from '@/modules/remocao/types'

// Query keys
export const QUERY_KEYS = {
  remocaos: (tenantId: string) => ['remocao', 'list', tenantId],
  dashboard: (tenantId: string) => ['remocao', 'dashboard', tenantId],
  summary: (tenantId: string) => ['remocao', 'summary', tenantId],
  detail: (id: string) => ['remocao', 'detail', id],
  checklist: (remocaoId: string) => ['remocao', 'checklist', remocaoId],
  gps: (remocaoId: string) => ['remocao', 'gps', remocaoId],
}

// Hook: list remocoes
export function useRemocoes(tenantId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.remocaos(tenantId || ''),
    queryFn: () => RemocaoRepository.list(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 min
  })
}

// Hook: dashboard view
export function useRemocaoDashboard(tenantId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard(tenantId || ''),
    queryFn: () => RemocaoRepository.getDashboardView(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2,
  })
}

// Hook: summary cards
export function useRemocaoSummary(tenantId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.summary(tenantId || ''),
    queryFn: () => RemocaoRepository.getSummary(tenantId || ''),
    enabled: !!tenantId,
    staleTime: 1000 * 60, // 1 min
    refetchInterval: 30000, // 30s
  })
}

// Hook: detail view
export function useRemocaoDetail(id: string, tenantId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => RemocaoRepository.getDetail(id, tenantId),
    enabled: !!id && !!tenantId,
    staleTime: 1000 * 60 * 2,
  })
}

// Hook: checklist
export function useChecklist(remocaoId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.checklist(remocaoId),
    queryFn: () => RemocaoRepository.getChecklistByRemocao(remocaoId),
    enabled: !!remocaoId,
    staleTime: 1000 * 30,
  })
}

// Hook: GPS positions
export function useGpsPosicoes(remocaoId: string, intervalMs = 30000) {
  return useQuery({
    queryKey: QUERY_KEYS.gps(remocaoId),
    queryFn: () => RemocaoRepository.getGpsUltimasPosicoes(remocaoId),
    enabled: !!remocaoId,
    staleTime: 1000 * 10,
    refetchInterval: intervalMs,
  })
}

// Hook: combined dashboard + summary + refetch (replaces useRemocoesQuery)
export function useRemocoesQuery(tenantId?: string) {
  const queryClient = useQueryClient()

  const { data: dashboardData, ...dashboardQuery } = useRemocaoDashboard(tenantId)
  const { data: summaryData, ...summaryQuery } = useRemocaoSummary(tenantId)

  return {
    remocoes: (dashboardData?.data || []) as RemocaoDashboardView[],
    loading: dashboardQuery.isLoading || summaryQuery.isLoading,
    error: dashboardQuery.error ? String(dashboardQuery.error) : summaryQuery.error ? String(summaryQuery.error) : null,
    summary: (summaryData?.data || {
      total_programadas: 0,
      aguardando_motorista: 0,
      em_deslocamento: 0,
      criticas: 0,
      concluidas: 0,
      pendentes: 0,
      intercorrencias: 0,
    }) as RemocaoSummary,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard(tenantId || '') })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary(tenantId || '') })
    },
  }
}
