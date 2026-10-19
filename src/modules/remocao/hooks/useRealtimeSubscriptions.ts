import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAudioAlert } from '@/modules/remocao/alerts/useAudioAlert'

export function useRealtimeSubscriptions() {
  const queryClient = useQueryClient()
  const audioAlert = useAudioAlert()

  useEffect(() => {
    const remocaoChannel = supabase
      .channel('remocao-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'remocao' },
        (payload: any) => {
          const newRemocao = payload.new as any

          queryClient.invalidateQueries({ queryKey: ['remocao', 'detail', newRemocao.id] })
          queryClient.setQueriesData(
            { queryKey: ['remocao', 'dashboard'] },
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                data: old.data
                  ? (old.data as any[]).map((r) => (r.id === newRemocao.id ? { ...r, ...newRemocao } : r))
                  : old.data,
              }
            }
          )

          if (newRemocao.status === 'EM_DESLOCAMENTO') {
            audioAlert.play('info', 'Veículo em deslocamento')
          } else if (newRemocao.status === 'CHEGADA_DESTINO') {
            audioAlert.play('info', 'Veículo chegou ao destino')
          } else if (newRemocao.prioridade === 'emergencial' && !newRemocao.status?.startsWith('ENC')) {
            audioAlert.play('critical', 'Remoção emergencial aguardando atenção')
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'remocao' },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ['remocao', 'dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['remocao', 'summary'] })
          const newRemocao = payload.new as any
          if (newRemocao.prioridade === 'emergencial') {
            audioAlert.play('critical', 'Nova remoção emergencial solicitada')
          }
        }
      )
      .subscribe()

    const intercChannel = supabase
      .channel('remocao-intercorrencias')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'remocao_intercorrencia' },
        (payload: any) => {
          const interc = payload.new as any
          queryClient.invalidateQueries({ queryKey: ['remocao', 'detail', interc.remocao_id] })
          audioAlert.play('critical', 'Intercorrência registrada')
        }
      )
      .subscribe()

    const gpsChannel = supabase
      .channel('remocao-gps')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'remocao_gps_posicao' },
        (payload: any) => {
          const gps = payload.new as any
          queryClient.setQueryData(
            ['remocao', 'gps', gps.remocao_id],
            (old: any) => {
              if (!old?.data) return old
              return {
                ...old,
                data: [gps, ...(old.data as any[])],
              }
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(remocaoChannel)
      supabase.removeChannel(intercChannel)
      supabase.removeChannel(gpsChannel)
    }
  }, [queryClient, audioAlert])
}
