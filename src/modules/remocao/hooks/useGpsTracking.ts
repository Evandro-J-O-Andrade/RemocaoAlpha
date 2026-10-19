import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RemocaoGpsPosicao } from '@/modules/remocao/types'

const GPS_UPDATE_INTERVAL = 10000 // 10 seconds (configurable per spec)

export function useGpsTracking(remocaoId?: string) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  const startTracking = () => {
    if (!navigator.geolocation) {
      return
    }

    setWatching(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos)

        if (remocaoId) {
          supabase.from('remocao_gps_posicao').insert({
            remocao_id: remocaoId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            altitude: pos.coords.altitude,
            recorded_at: new Date().toISOString(),
          })
        }
      },
      (_err) => { },
      {
        enableHighAccuracy: true,
        maximumAge: GPS_UPDATE_INTERVAL,
        timeout: 10000,
      }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
  }

  const getLastKnownPosition = async (remocaoId: string): Promise<RemocaoGpsPosicao | null> => {
    const { data } = await supabase
      .from('remocao_gps_posicao')
      .select('*')
      .eq('remocao_id', remocaoId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data as RemocaoGpsPosicao | null
  }

  useEffect(() => {
    return () => stopTracking()
  }, [])

  return {
    position,
    watching,
    startTracking,
    stopTracking,
    getLastKnownPosition,
    lat: position?.coords.latitude,
    lng: position?.coords.longitude,
    speed: position?.coords.speed,
    heading: position?.coords.heading,
  }
}
