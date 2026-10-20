import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import { Header } from '@/modules/remocao/components/Header'
import { StatePage } from '@/modules/remocao/components/StatePage'
import { SolicitacaoRemocaoForm } from '@/modules/remocao/forms/SolicitacaoRemocaoForm'
import { useAuth } from '@/app/providers/AuthProvider'

export function NovaRemocaoPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const tenantId = user.tenant_id

  if (!tenantId) {
    return (
      <StatePage
        variant="unauthorized"
        icon={<AlertTriangle size={40} />}
        title="Organização não vinculada"
        description="Você não possui uma organização ativa. Solicite acesso a um administrador antes de solicitar remoções."
      >
        <div className="flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </button>
        </div>
      </StatePage>
    )
  }

  const handleSuccess = (remocaoId: string) => {
    setError(null)
    navigate(`/remocao/${remocaoId}`)
  }

  return (
    <div className="remocao-module min-h-screen">
      <Header />

      <div className="remocao-page">
        <div className="remocao-page__header">
          <button
            onClick={() => navigate('/')}
            className="remocao-btn remocao-btn--ghost remocao-btn--sm flex items-center gap-2"
          >
            <ChevronLeft size={16} />
            Voltar
          </button>
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">Nova Remoção</p>
            <h1 className="remocao-page__title">Solicitar transporte de paciente</h1>
            <p className="remocao-page__subtitle">
              Preencha os dados abaixo para criar uma nova solicitação de remoção.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="remocao-card">
          <SolicitacaoRemocaoForm
            tenantId={tenantId}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  )
}
