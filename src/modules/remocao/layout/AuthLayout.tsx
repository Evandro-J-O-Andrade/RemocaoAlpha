import { useEffect, useState } from 'react'
import { Menu, User, ChevronLeft, LogOut, FileText, BarChart3, Users, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { OrganizationSwitcher } from '@/modules/remocao/components/OrganizationSwitcher'
import { cn } from '@/lib/cn'
import { Perm } from '@/modules/remocao/permissions'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      setMobileMenuOpen(false)
    }

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const hasPerm = (p: string) => Boolean(user?.permissions.includes(p as any) || user?.is_root)
  const hasAnyPerm = (permissions: string[]) => Boolean(user?.is_root || permissions.some((permission) => user?.permissions.includes(permission as any)))

  return (
    <div className="auth-layout">
      <button
        className="auth-mobile-menu-toggle"
        onClick={() => setMobileMenuOpen((open) => !open)}
        aria-label={mobileMenuOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      >
        <Menu size={20} />
      </button>

      {isMobile && mobileMenuOpen && (
        <button
          type="button"
          className="auth-sidebar-backdrop"
          aria-label="Fechar menu lateral"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'auth-sidebar',
          isMobile
            ? (mobileMenuOpen ? 'auth-sidebar--mobile-open' : 'auth-sidebar--mobile-closed')
            : (sidebarOpen ? 'auth-sidebar--open' : 'auth-sidebar--closed')
        )}
      >
        <div className="auth-sidebar__brand">
          <div className="auth-sidebar__logo">
            <img
              src="/img/alpha_branco_vazado_FINAL.webp"
              alt="Remocao Alpha"
              className="auth-sidebar__logo-img"
            />
          </div>
          {(isMobile ? mobileMenuOpen : sidebarOpen) && (
            <span className="auth-sidebar__brand-text">Remocao Alpha</span>
          )}
        </div>

        <nav className="auth-sidebar__nav">
          {hasAnyPerm([Perm.REMOCACAO_VISUALIZAR, Perm.DASHBOARD_VISUALIZAR]) && (
            <Link
              to="/"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><User size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Central de Remocoes</span>}
            </Link>
          )}
          {hasPerm(Perm.REMOCACAO_SOLICITAR) && (
            <Link
              to="/nova-remocao"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><User size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Nova Remocao</span>}
            </Link>
          )}
          {hasPerm(Perm.RELATORIO_VISUALIZAR) && (
            <Link
              to="/relatorios"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><FileText size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Relatorios</span>}
            </Link>
          )}
          {hasPerm(Perm.DASHBOARD_VISUALIZAR) && (
            <Link
              to="/dashboard-analitico"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><BarChart3 size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Dashboard Analitico</span>}
            </Link>
          )}
          {hasAnyPerm([Perm.ADMIN_USERS_MANAGE, Perm.ADMIN_ROLES_MANAGE, Perm.ADMIN_TENANT_MANAGE]) && (
            <Link
              to="/admin"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><Users size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Gestao de Acessos</span>}
            </Link>
          )}
          {user?.is_root && (
            <Link
              to="/admin"
              className="auth-sidebar__nav-item"
              onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
            >
              <span className="auth-sidebar__nav-icon"><Shield size={18} /></span>
              {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Administracao Global</span>}
            </Link>
          )}
          <Link
            to="/account"
            className="auth-sidebar__nav-item"
            onClick={() => { if (isMobile) setMobileMenuOpen(false) }}
          >
            <span className="auth-sidebar__nav-icon"><User size={18} /></span>
            {(!isMobile || mobileMenuOpen) && <span className="auth-sidebar__nav-label">Minha Conta</span>}
          </Link>
        </nav>

        <div className="auth-sidebar__footer">
          <div className="auth-sidebar__user">
            <div className="auth-sidebar__avatar">
              <User size={20} />
            </div>
            <div className="auth-sidebar__user-info">
              {(!isMobile || mobileMenuOpen) && (
                <>
                  <div className="auth-sidebar__user-name">
                    {user?.username || 'Usuario'}
                  </div>
                  <div className="auth-sidebar__user-role">
                    {user?.papel || 'carregando...'}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className={cn('auth-sidebar__signout', (!isMobile || mobileMenuOpen) && 'auth-sidebar__signout--label')}
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
            {(!isMobile || mobileMenuOpen) && <span>Encerrar sessao</span>}
          </button>
        </div>
      </aside>

      <div className="auth-layout__body">
        <header className="auth-header">
          <button
            className="auth-header__sidebar-toggle"
            onClick={() => isMobile ? setMobileMenuOpen((open) => !open) : setSidebarOpen((open) => !open)}
            aria-label="Alternar sidebar"
          >
            {(isMobile ? mobileMenuOpen : sidebarOpen) ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
          <div className="auth-header__title">
            <h1 className="auth-header__title-text">Gestao de Remocao Alpha</h1>
          </div>
          <div className="auth-header__actions">
            <div className="auth-header__organization">
              <OrganizationSwitcher />
            </div>
          </div>
        </header>

        <main className="auth-main">{children}</main>

        <footer className="auth-footer">
          <div className="auth-footer__content">
            <span>© 2026 RemocaoAlpha — New Wave Sistema Digital</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
