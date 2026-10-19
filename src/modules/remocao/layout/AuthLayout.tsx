import { useState } from 'react'
import { Menu, LogOut, User, Bell, Settings, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { OrganizationSwitcher } from '@/modules/remocao/components/OrganizationSwitcher'
import { cn } from '@/lib/cn'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <div className="auth-layout">
      <button
        className="auth-mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <aside
        className={cn(
          'auth-sidebar',
          sidebarOpen ? 'auth-sidebar--open' : 'auth-sidebar--closed',
          isMobile && !mobileMenuOpen ? 'auth-sidebar--mobile-closed' : ''
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
          {!sidebarOpen && !isMobile && (
            <span className="auth-sidebar__brand-text">Remocao Alpha</span>
          )}
        </div>

        <nav className="auth-sidebar__nav">
          <a
            href="/"
            className={cn('auth-sidebar__nav-item', sidebarOpen && 'auth-sidebar__nav-item--active')}
            onClick={() => {
              if (isMobile) setMobileMenuOpen(false)
              setSidebarOpen(false)
            }}
          >
            <span className="auth-sidebar__nav-icon">
              <User size={18} />
            </span>
            {sidebarOpen && <span className="auth-sidebar__nav-label">Central de Remocoes</span>}
          </a>
          <a
            href="/account"
            className="auth-sidebar__nav-item"
            onClick={() => {
              if (isMobile) setMobileMenuOpen(false)
              setSidebarOpen(false)
            }}
          >
            <span className="auth-sidebar__nav-icon">
              <User size={18} />
            </span>
            {sidebarOpen && <span className="auth-sidebar__nav-label">Minha Conta</span>}
          </a>
          {user?.is_root && (
            <a
              href="/admin"
              className="auth-sidebar__nav-item"
              onClick={() => {
                if (isMobile) setMobileMenuOpen(false)
                setSidebarOpen(false)
              }}
            >
              <span className="auth-sidebar__nav-icon">
                <Settings size={18} />
              </span>
              {sidebarOpen && <span className="auth-sidebar__nav-label">Admin</span>}
            </a>
          )}
        </nav>

        <div className="auth-sidebar__footer">
          <div className="auth-sidebar__user">
            <div className="auth-sidebar__avatar">
              <User size={20} />
            </div>
            <div className="auth-sidebar__user-info">
              {sidebarOpen && (
                <>
                  <div className="auth-sidebar__user-name">
                    {user?.nome || 'Usuario'}
                  </div>
                  <div className="auth-sidebar__user-role">
                    {user?.papel || 'carregando...'}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={signOut}
            className={cn('auth-sidebar__signout', sidebarOpen && 'auth-sidebar__signout--label')}
            title="Sair"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="auth-layout__body">
        <header className="auth-header">
          <button
            className="auth-header__sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Alternar sidebar"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
          <div className="auth-header__title">
            <h1 className="auth-header__title-text">HIS — Gestao de Remocao</h1>
          </div>
          <div className="auth-header__actions">
            <button className="auth-header__icon-btn" title="Notificacoes">
              <Bell size={20} />
            </button>
            <button className="auth-header__icon-btn" title="Configuracoes">
              <Settings size={20} />
            </button>
            <div className="auth-header__user">
              <div className="auth-header__avatar">
                <User size={20} />
              </div>
              <div className="auth-header__user-info">
                {sidebarOpen && (
                  <>
                    <div className="auth-header__user-name">
                      {user?.nome || 'Usuario'}
                    </div>
                    <OrganizationSwitcher />
                  </>
                )}
                <div className="auth-header__user-role">
                  {user?.papel || 'carregando...'}
                </div>
              </div>
              <button onClick={signOut} className="auth-header__signout" title="Sair">
                <LogOut size={16} />
              </button>
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
