import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { RemocaoGpsPosicao } from '@/modules/remocao/types'
import { supabase } from '@/lib/supabase/client'

export function GPSMap({ remocaoId, height = 'h-64' }: { remocaoId: string; height?: string }) {
  const [posicoes, setPosicoes] = useState<RemocaoGpsPosicao[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    const fetchGps = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: supabaseError } = await supabase
          .from('remocao_gps_posicao')
          .select('*')
          .eq('remocao_id', remocaoId)
          .order('recorded_at', { ascending: false })
          .limit(50)

        if (supabaseError) throw supabaseError
        if (mounted) {
          setPosicoes(data || [])
          if ((data || []).length === 0) {
            setError('Nenhuma posição GPS registrada para esta remoção.')
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Falha ao consultar posições GPS. Tente novamente.')
          setPosicoes([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchGps()

    const channel = supabase
      .channel(`gps-${remocaoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'remocao_gps_posicao',
        filter: `remocao_id=eq.${remocaoId}`,
      }, (payload: any) => {
        const newPos = payload.new as RemocaoGpsPosicao
        setPosicoes((prev) => [newPos, ...prev.slice(0, 49)])
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [remocaoId])

  const ultimaPosicao = posicoes[0]
  const hasSignal = !!ultimaPosicao

  if (loading) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <span className="text-gray-500">Carregando posição GPS...</span>
      </div>
    )
  }

  if (error && !hasSignal) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-[#0F172A] rounded-lg border border-[#1E2F52]`}>
        <div className="text-center text-slate-400">
          <span className="mb-1 block">⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const center: [number, number] = [ultimaPosicao.latitude, ultimaPosicao.longitude]
  const zoom = 15

  return (
    <div className={`w-full ${height} rounded-lg border border-[#1E2F52] bg-[#0B1222] relative overflow-hidden`}>
      <MapContainer
        center={center}
        zoom={zoom}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            <div className="text-left">
              <p className="text-sm font-semibold">Última posição GPS</p>
              <p className="text-xs text-slate-400">
                {ultimaPosicao.latitude.toFixed(6)}, {ultimaPosicao.longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
        <MapEvent onEvent={(map) => { mapRef.current = map }} />
      </MapContainer>

      <div className="absolute bottom-4 left-4 right-4 bg-[#121D33] border border-[#23365F] rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Posição atual</span>
                <div className="text-sm font-mono font-medium">
                  {ultimaPosicao.latitude.toFixed(6)}, {ultimaPosicao.longitude.toFixed(6)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase">Última atualização</span>
                <div className="text-sm font-medium">
                  {new Date(ultimaPosicao.recorded_at).toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>
            {ultimaPosicao.speed !== null && (
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>Velocidade: {Math.round((ultimaPosicao.speed || 0) * 3.6)} km/h</span>
                {ultimaPosicao.heading !== null && <span>Direção: {Math.round(ultimaPosicao.heading || 0)}°</span>}
                {ultimaPosicao.accuracy && <span>Precisão: ±{ultimaPosicao.accuracy}m</span>}
              </div>
            )}
          </div>
          <span className={clsxStatus('remocao-status__dot', hasSignal)}></span>
          <span className={`text-[10px] font-bold uppercase ${hasSignal ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasSignal ? 'SINAL OK' : 'SEM SINAL'}
          </span>
        </div>
      </div>
    </div>
  )
}

function clsxStatus(base: string, ok: boolean): string {
  return `${base} w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`
}

function MapEvent({ onEvent }: { onEvent: (map: any) => void }) {
  const map = useMap()
  useEffect(() => {
    onEvent(map)
  }, [])
  return null
}
