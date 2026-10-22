import { useEffect, useState } from 'react'
import { MapPin, Radio, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { RemocaoGpsPosicao } from '@/modules/remocao/types'

export function GPSMap({ remocaoId, height = 'h-64' }: { remocaoId: string; height?: string }) {
  const [posicoes, setPosicoes] = useState<RemocaoGpsPosicao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchGps = async () => {
      setLoading(true)
      const { data, error: queryError } = await supabase
        .from('remocao_gps_posicao')
        .select('*')
        .eq('remocao_id', remocaoId)
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (cancelled) return
      if (queryError) {
        setError('Não foi possível consultar as posições GPS desta remoção.')
      } else {
        setError(null)
        setPosicoes((data || []) as RemocaoGpsPosicao[])
      }
      setLoading(false)
    }

    void fetchGps()
    const channel = supabase
      .channel(`gps-${remocaoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'remocao_gps_posicao',
        filter: `remocao_id=eq.${remocaoId}`,
      }, (payload) => {
        const newPos = payload.new as RemocaoGpsPosicao
        setPosicoes((previous) => [newPos, ...previous.filter((position) => position.id !== newPos.id)].slice(0, 50))
      })
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [remocaoId])

  const latest = posicoes[0]

  if (loading) {
    return <div className={`flex w-full ${height} items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground`} role="status"><RefreshCw size={15} className="animate-spin" />Consultando posição GPS…</div>
  }

  if (error) {
    return <div className={`flex w-full ${height} flex-col items-center justify-center gap-2 rounded-lg border border-destructive/25 bg-destructive/[0.035] p-5 text-center`} role="alert"><MapPin size={23} className="text-destructive" /><p className="text-sm font-semibold text-foreground">GPS indisponível</p><p className="max-w-sm text-xs leading-5 text-muted-foreground">{error}</p></div>
  }

  if (!latest) {
    return (
      <div className={`flex w-full ${height} flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/25 px-5 text-center`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><Radio size={21} /></span>
        <p className="mt-3 text-sm font-semibold text-foreground">Nenhuma posição recebida</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">O mapa será exibido quando o motorista ou dispositivo autorizado enviar coordenadas para esta remoção.</p>
      </div>
    )
  }

  const lat = latest.latitude
  const lon = latest.longitude
  const span = 0.005
  const bbox = `${lon - span},${lat - span},${lon + span},${lat + span}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background" translate="no">
      <iframe
        className={`w-full ${height} rounded-lg`}
        src={src}
        title="Mapa OpenStreetMap - última posição GPS"
        referrerPolicy="no-referrer-when-downgrade" translate="no"
        loading="lazy"
        style={{ border: 0 }}
      />
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><MapPin size={13} className="shrink-0 text-primary" />{lat.toFixed(5)}, {lon.toFixed(5)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Última posição: {new Date(latest.recorded_at).toLocaleString('pt-BR')}{latest.accuracy != null ? ` · Precisão ±${Math.round(latest.accuracy)} m` : ''}</p>
          {latest.speed != null && <p className="mt-1 text-[11px] text-muted-foreground">Velocidade registrada: {Math.round(latest.speed * 3.6)} km/h</p>}
        </div>
      </div>
    </div>
  )
}
