import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { CentralRemocoesPage } from '@/modules/remocao/pages/CentralRemocoesPage'
import { Perm } from '@/modules/remocao/permissions'

export function Container() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.password_reset_required) {
      navigate('/change-password', { replace: true })
    }
  }, [user, navigate])

  if (!user) return null

  const canView = user.permissions.includes(Perm.DASHBOARD_VISUALIZAR) ||
    user.permissions.includes(Perm.REMOCACAO_VISUALIZAR) ||
    user.is_root

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para visualizar esta página.</p>
          <button onClick={signOut} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Sair
          </button>
        </div>
      </div>
    )
  }

  return <CentralRemocoesPage />
}
