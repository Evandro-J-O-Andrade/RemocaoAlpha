import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

export type AlertPriority = 'baixa' | 'media' | 'alta' | 'critica' | 'info' | 'critical'

export function useAudioAlert() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastAlertRef = useRef<{ time: number; priority: AlertPriority } | null>(null)

  useEffect(() => { }, [])

  const play = (priority: AlertPriority, message: string) => {
    const now = Date.now()
    const throttle = priority === 'critica' || priority === 'critical' ? 30000 : 10000
    const last = lastAlertRef.current

    if (last && now - last.time < throttle && last.priority === priority) {
      console.warn(`Alert throttled: ${message}`)
      return
    }

    lastAlertRef.current = { time: now, priority }

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      const freqMap: Record<AlertPriority, number> = {
        baixa: 440,
        media: 880,
        alta: 1320,
        critica: 1760,
        info: 660,
        critical: 1760,
      }

      oscillator.frequency.value = freqMap[priority]
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.error('Audio alert failed:', e)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  return { play, stop }
}

export function useAlertRecognition() {
  const recognize = async (alertId: string, usuarioId: string) => {
    if (!alertId || !usuarioId) {
      return { data: null, error: new Error('alertId and usuarioId are required') }
    }

    const { data: current, error: fetchErr } = await supabase
      .from('remocao_auditoria')
      .select('detalhes')
      .eq('id', alertId)
      .single()

    if (fetchErr || !current) {
      return { data: null, error: fetchErr || new Error('Audit record not found') }
    }

    const detalhes = current.detalhes || {}
    const updatedDetalhes = { ...detalhes, alerta_reconhecido_por: usuarioId }

    const { data, error } = await supabase
      .from('remocao_auditoria')
      .update({ detalhes: updatedDetalhes })
      .eq('id', alertId)

    return { data, error }
  }

  return { recognize }
}
