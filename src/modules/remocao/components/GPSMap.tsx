import { useEffect, useState } from 'react'
import { MapPin, Map } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { RemocaoGpsPosicao } from '@/modules/remocao/types'

export function GPSMap({ remocaoId, height = 'h-64' }: { remocaoId: string; height?: string }) {
  const [posicoes, setPosicoes] = useState<RemocaoGpsPosicao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGps = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('remocao_gps_posicao')
        .select('*')
        .eq('remocao_id', remocaoId)
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (!error) setPosicoes(data || [])
      setLoading(false)
    }

    fetchGps()

    // Subscribe to new GPS positions
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
      supabase.removeChannel(channel)
    }
  }, [remocaoId])

  const ultimaPosicao = posicoes[0]

  if (loading) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <span className="text-gray-500">Carregando mapa...</span>
      </div>
    )
  }

  return (
    <div className={`w-full ${height} border rounded-lg bg-gray-50 relative overflow-hidden`}>
      {/* Map placeholder - in production, integrate with Mapbox/Leaflet/Google Maps */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Map size={48} className="text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Mapa interativo (integração com provedor de mapas)</p>
        </div>
      </div>

      {/* Position overlay */}
      {ultimaPosicao && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <div>
                  <span className="text-xs text-gray-500">Posição atual</span>
                  <div className="text-sm font-medium">
                    {ultimaPosicao.latitude.toFixed(6)}, {ultimaPosicao.longitude.toFixed(6)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Última atualização</span>
                  <div className="text-sm font-medium">
                    {new Date(ultimaPosicao.recorded_at).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>
              {ultimaPosicao.speed !== null && (
                <div className="mt-2 flex gap-4 text-xs text-gray-600">
                  <span>Velocidade: {Math.round((ultimaPosicao.speed || 0) * 3.6)} km/h</span>
                  {ultimaPosicao.heading !== null && <span>Direção: {Math.round(ultimaPosicao.heading || 0)}°</span>}
                  {ultimaPosicao.accuracy && <span>Precisão: ±{ultimaPosicao.accuracy}m</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
