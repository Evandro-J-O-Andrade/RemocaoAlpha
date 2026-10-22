import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import type { ReactNode } from 'react'
import type { PermissionKey } from '@/modules/remocao/permissions'
import { FeedbackPage } from '@/modules/remocao/components/FeedbackPage'
import { LoadingAppPage } from '@/modules/remocao/pages/LoadingAppPage'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, stage } = useAuth()

  if (loading && !user) {
    return <LoadingAppPage />
  }

  if (!user && stage === 'empty') {
    return <Navigate to="/login" replace />
  }

  if (user?.password_reset_required && window.location.pathname !== '/change-password') {
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
  const { user, loading, status, refreshUser } = useAuth()

  if (loading || !user) {
    return <LoadingAppPage />
  }

  if (status === 'error') {
    return (
      <FeedbackPage
        variant="error"
        title="Falha ao validar acesso"
        description="Não foi possível confirmar suas permissões no servidor. Nenhuma permissão foi concedida automaticamente."
        onRetry={() => { void refreshUser() }}
      />
    )
  }

  if (status === 'no_tenant') {
    return (
      <FeedbackPage
        variant="unauthorized"
        title="Nenhuma organizacao vinculada"
        description="Voce esta autenticado, mas nao possui vinculo com nenhuma organizacao. Solicite acesso a um administrador."
        onHome={() => (window.location.href = '/')}
      />
    )
  }

  if (status === 'unauthorized') {
    return (
      <FeedbackPage
        variant="forbidden"
        title="Acesso negado"
        description="Voce nao possui permissoes para acessar esta pagina."
        onHome={() => (window.location.href = '/')}
      />
    )
  }

  if (!hasEffectivePermission(user.permissions, user.is_root, requiredPerms)) {
    return (
      <FeedbackPage
        variant="forbidden"
        title="Acesso negado"
        description="Voce nao possui permissao para acessar esta pagina."
        onHome={() => (window.location.href = '/')}
      />
    )
  }

  return children
}
