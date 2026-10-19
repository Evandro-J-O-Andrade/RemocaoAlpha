import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import type { ReactNode } from 'react'
import type { PermissionKey } from '@/modules/remocao/permissions'
import { FeedbackPage } from '@/modules/remocao/components/FeedbackPage'
import { LoadingAppPage } from '@/modules/remocao/pages/LoadingAppPage'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, stage } = useAuth()
  const location = useLocation()

  // Durante a validação inicial da sessão, mostra a tela de loading institucional
  if (loading && !user) {
    return <LoadingAppPage />
  }

  if (!user && stage === 'empty') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Força troca de senha no primeiro login
  if (user?.password_reset_required && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return children
}

export function RequirePermission({
  permissions: requiredPerms,
  children,
}: {
  permissions: PermissionKey | PermissionKey[]
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ROOT bypass: admin_master tem todos os privilégios
  if (user.is_root) {
    return children
  }

  const userPerms = user.permissions
  const required = Array.isArray(requiredPerms) ? requiredPerms : [requiredPerms]
  const hasAll = required.every((p) => userPerms.includes(p))

  if (!hasAll) {
    return (
      <FeedbackPage
        variant="forbidden"
        onHome={() => (window.location.href = '/')}
      />
    )
  }

  return children
}