import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RemocaoService } from '@/modules/remocao/services/remocaoService'
import { useAuth } from '@/app/providers/AuthProvider'

// Hook for creating a new remocao (solicitação)
export function useSolicitarRemocao() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const solicitar = async (payload: any) => {
    setLoading(true)
    setError(null)
    const result = await RemocaoService.solicitar(payload)
    setLoading(false)
    if (result.error) setError(String(result.error.message || result.error))
    return result
  }

  return { solicitar, loading, error }
}

// Hook for team management
export function useEquipe(remocaoId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const montarEquipe = async (
    tenantId: string,
    membros: { profissional_id: string; profissional_nome: string; role: string; profissional_cargo?: string }[]
  ) => {
    setLoading(true)
    setError(null)
    const result = await RemocaoService.montarEquipe(remocaoId, tenantId, membros)
    setLoading(false)
    if (result.error) setError(String(result.error.message || result.error))
    return result
  }

  return { montarEquipe, loading, error }
}

// Hook for driver check-in
export function useDriverCheckin(remocaoId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkin = async (payload: {
    motorista_id: string
    veiculo_id: string
    quilometragem_inicial: number
    observacoes?: string
  }) => {
    setLoading(true)
    setError(null)
    const result = await RemocaoService.registrarCheckin(remocaoId, {
      ...payload,
    } as any)
    setLoading(false)
    if (result.error) setError(String(result.error.message || result.error))
    return result
  }

  return { checkin, loading, error }
}

// Hook for driver check-out
export function useDriverCheckout(remocaoId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (payload: {
    motorista_id: string
    veiculo_id: string
    quilometragem_final: number
    retorno_com_paciente: boolean
    retorno_com_equipe: boolean
    intercorrencias?: string
    problemas_veiculo?: string
    observacoes?: string
  }) => {
    setLoading(true)
    setError(null)
    const result = await RemocaoService.registrarCheckout(remocaoId, payload as any)
    setLoading(false)
    if (result.error) setError(String(result.error.message || result.error))
    return result
  }

  return { checkout, loading, error }
}

// Hook for status transitions
export function useStatusTransition() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const transitar = async (
    remocaoId: string,
    novoStatus: string,
    motivo?: string
  ) => {
    if (!user) {
      setError('Usuário não autenticado')
      return { data: null, error: new Error('Usuário não autenticado') }
    }

    setLoading(true)
    setError(null)
    const result = await RemocaoService.transicionarStatus(
      remocaoId,
      novoStatus as any,
      user.id,
      user.tenant_id,
      motivo
    )
    setLoading(false)
    if (result.error) setError(String(result.error.message || result.error))
    return result
  }

  return { transitar, loading, error }
}

// Hook for intercorrencias
export function useIntercorrencias(remocaoId: string) {
  const [intercorrencias, setIntercorrencias] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    if (!remocaoId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('remocao_intercorrencia')
      .select('*')
      .eq('remocao_id', remocaoId)
      .order('created_at', { ascending: false })
    if (!error) setIntercorrencias(data || [])
    setLoading(false)
  }

  const registrar = async (payload: any) => {
    const result = await RemocaoService.registrarIntercorrencia(payload)
    if (!result.error) {
      setIntercorrencias((prev) => [result.data, ...prev])
    }
    return result
  }

  useEffect(() => {
    fetch()
  }, [remocaoId])

  return { intercorrencias, loading, registrar, refetch: fetch }
}

// Hook for documents
export function useDocumentos(remocaoId: string) {
  const [documentos, setDocumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    if (!remocaoId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('remocao_documento')
      .select('*')
      .eq('remocao_id', remocaoId)
      .order('created_at', { ascending: false })
    if (!error) setDocumentos(data || [])
    setLoading(false)
  }

  const upload = async (file: File, tipo: string, titulo: string, tenantId: string) => {
    const result = await RemocaoService.uploadDocumento(remocaoId, tenantId, file, tipo, titulo)
    if (!result.error) {
      setDocumentos((prev) => [result.data, ...prev])
    }
    return result
  }

  useEffect(() => {
    fetch()
  }, [remocaoId])

  return { documentos, loading, upload, refetch: fetch }
}
