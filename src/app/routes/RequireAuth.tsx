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

import { hasEffectivePermission } from '@/modules/remocao/permissions/rbac'

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

  if (!hasEffectivePermission(user.permissions, user.is_root, requiredPerms)) {
    return (
      <FeedbackPage
        variant="forbidden"
        onHome={() => (window.location.href = '/')}
      />
    )
  }

  return children
}