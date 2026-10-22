import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

export function DashboardAnaliticoPage() {
  const { user: _user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [byUnidade, setByUnidade] = useState<Record<string, number>>({})
  const [byTransporte, setByTransporte] = useState<Record<string, number>>({})
  const [pendentes, setPendentes] = useState(0)
  const [canceladas, setCanceladas] = useState(0)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('remocao')
        .select('status, finalidade, origem_unidade_id, remocao_unidade:origem_unidade_id(nome, codigo)')
        .limit(1000)
      if (err) throw err

      const rows = data || []
      setTotal(rows.length)

      const statusCount: Record<string, number> = {}
      const unidadeCount: Record<string, number> = {}
      const transporteCount: Record<string, number> = {}
      let pend = 0
      let canc = 0

      for (const r of rows as any[]) {
        statusCount[r.status || 'desconhecido'] = (statusCount[r.status || 'desconhecido'] || 0) + 1
        const unidade = r.remocao_unidade?.nome || r.remocao_unidade?.codigo || 'Sem unidade'
        unidadeCount[unidade] = (unidadeCount[unidade] || 0) + 1
        transporteCount[r.finalidade || 'outro'] = (transporteCount[r.finalidade || 'outro'] || 0) + 1
        if (r.status === 'SOLICITADA' || r.status === 'AGUARDANDO_DESTINO' || r.status === 'AGUARDANDO_EQUIPE' || r.status === 'AGUARDANDO_MOTORISTA') pend++
        if (r.status === 'CANCELADA') canc++
      }

      setByStatus(statusCount)
      setByUnidade(unidadeCount)
      setByTransporte(transporteCount)
      setPendentes(pend)
      setCanceladas(canc)
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar indicadores')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-empty">
            <span className="remocao-spinner" />
            <p className="remocao-empty__text">Carregando indicadores...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-alert remocao-alert--danger" role="alert">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <div className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">DASHBOARD ANALÍTICO</p>
            <h1 className="remocao-page__title">Gestão de Remoções</h1>
            <p className="remocao-page__subtitle">Indicadores calculados a partir dos dados reais do banco.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="remocao-card p-4">
            <p className="text-sm text-gray-500">Total de remoções</p>
            <p className="text-2xl font-bold">{total}</p>
            <Link to="/relatorios/remocoes-periodo" className="text-xs text-blue-600">Ver detalhes →</Link>
          </div>
          <div className="remocao-card p-4">
            <p className="text-sm text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold">{pendentes}</p>
            <Link to="/relatorios/remocoes-pendentes" className="text-xs text-blue-600">Ver detalhes →</Link>
          </div>
          <div className="remocao-card p-4">
            <p className="text-sm text-gray-500">Canceladas</p>
            <p className="text-2xl font-bold">{canceladas}</p>
            <Link to="/relatorios/remocoes-canceladas" className="text-xs text-blue-600">Ver detalhes →</Link>
          </div>
          <div className="remocao-card p-4">
            <p className="text-sm text-gray-500">Unidades</p>
            <p className="text-2xl font-bold">{Object.keys(byUnidade).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="remocao-card p-4">
            <h3 className="font-bold mb-3">Por status</h3>
            {Object.entries(byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="remocao-card p-4">
            <h3 className="font-bold mb-3">Por unidade de origem</h3>
            {Object.entries(byUnidade).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="remocao-card p-4">
          <h3 className="font-bold mb-3">Por finalidade (tipo de transporte)</h3>
          {Object.entries(byTransporte).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1 border-b">
              <span>{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
