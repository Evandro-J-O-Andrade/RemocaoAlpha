import { Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom'
import { LoginPage } from '@/modules/remocao/pages/LoginPage'
import { CentralRemocoesPage } from '@/modules/remocao/pages/CentralRemocoesPage'
import { NovaRemocaoPage } from '@/modules/remocao/pages/NovaRemocaoPage'
import { RemocaoDetailPage } from '@/modules/remocao/pages/RemocaoDetailPage'
import { DriverInterface } from '@/modules/remocao/pages/DriverInterface'
import { AdminManagementPage } from '@/modules/remocao/pages/AdminManagementPage'
import { ReportsPage } from '@/modules/remocao/pages/ReportsPage'
import { DashboardAnaliticoPage } from '@/modules/remocao/pages/DashboardAnaliticoPage'
import { AccountPage } from '@/modules/remocao/pages/AccountPage'
import { RequireAuth, RequirePermission } from '@/app/routes/RequireAuth'
import { Perm } from '@/modules/remocao/permissions'
import { PasswordResetPage } from '@/modules/remocao/pages/PasswordResetPage'
import { AuthLayout } from '@/modules/remocao/layout/AuthLayout'
import { ErrorBoundary } from '@/modules/remocao/components/ErrorBoundary'
import { LoadingAppPage } from '@/modules/remocao/pages/LoadingAppPage'
import { ErrorPage } from '@/modules/remocao/pages/ErrorPage'
import { FallbackPage } from '@/modules/remocao/pages/FallbackPage'
import { RollbackPage } from '@/modules/remocao/pages/RollbackPage'

function DriverRoute() {
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return <DriverInterface remocaoId={id} />
}

function ProtectedLayout() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}

export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Loading — inicialização da aplicação */}
        <Route path="/loading" element={<LoadingAppPage />} />

        {/* Error — falha inesperada */}
        <Route path="/error" element={<ErrorPage />} />

        {/* Fallback — degradação controlada */}
        <Route path="/fallback" element={<FallbackPage />} />

        {/* Rollback — reversão de operação */}
        <Route path="/rollback" element={<RollbackPage />} />

        {/* First-login password change (before any navigation) */}
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <PasswordResetPage />
            </RequireAuth>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <RequireAuth>
              <ProtectedLayout />
            </RequireAuth>
          }
        >
          <Route
            path="/"
            element={
              <RequirePermission permissions={[Perm.DASHBOARD_VISUALIZAR, Perm.REMOCACAO_VISUALIZAR]}>
                <CentralRemocoesPage />
              </RequirePermission>
            }
          />

          <Route
            path="/nova-remocao"
            element={
              <RequirePermission permissions={[Perm.REMOCACAO_SOLICITAR]}>
                <NovaRemocaoPage />
              </RequirePermission>
            }
          />


          <Route
            path="/remocao/:id"
            element={
              <RequirePermission permissions={Perm.REMOCACAO_VISUALIZAR}>
                <RemocaoDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="/driver/:id"
            element={
              <RequirePermission permissions={Perm.MOTORISTA_CHECKIN}>
                <DriverRoute />
              </RequirePermission>
            }
          />

          <Route
            path="/admin"
            element={
              <RequirePermission permissions={[Perm.ADMIN_USERS_MANAGE, Perm.ADMIN_ROLES_MANAGE]}>
                <AdminManagementPage />
              </RequirePermission>
            }
          />

          <Route
            path="/relatorios/*"
            element={
              <RequirePermission permissions={Perm.RELATORIO_VISUALIZAR}>
                <ReportsPage />
              </RequirePermission>
            }
          />


          <Route
            path="/dashboard-analitico"
            element={
              <RequirePermission permissions={Perm.DASHBOARD_VISUALIZAR}>
                <DashboardAnaliticoPage />
              </RequirePermission>
            }
          />

          <Route
            path="/account"
            element={<AccountPage />}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  )
}