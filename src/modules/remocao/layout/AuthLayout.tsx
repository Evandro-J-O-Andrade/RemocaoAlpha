import { useState, useEffect, useRef } from 'react'
import { Ambulance, Plus, FileText, BarChart3, Users, Shield, User, ChevronLeft, LogOut, Menu, Sun, Moon, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { OrganizationSwitcher } from '@/modules/remocao/components/OrganizationSwitcher'
import { cn } from '@/lib/cn'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Perm } from '@/modules/remocao/permissions'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [desktopCollapsed, setDesktopCollapsed] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isActive = (path: string) => location.pathname === path

  // Detectar mobile de forma reativa com matchMedia
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
      if (!e.matches) setMobileMenuOpen(false)
    }
    handler(mql)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const hasPerm = (p: string) => user?.permissions.includes(p as any) || user?.is_root

  // Fechar sidebar mobile ao clicar fora
  useEffect(() => {
    if (!isMobile || !mobileMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isMobile, mobileMenuOpen])

  // Fechar sidebar mobile ao mudar de rota
  useEffect(() => {
    if (isMobile) setMobileMenuOpen(false)
  }, [location.pathname, isMobile])

  const closeMobile = () => { if (isMobile) setMobileMenuOpen(false) }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são permitidas.')
      return
    }
    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 2MB.')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const avatarUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('people')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshUser()
    } catch (err: any) {
      console.error('[AuthLayout] Erro no upload de avatar:', err)
      alert('Erro ao enviar avatar: ' + (err.message || 'Falha desconhecida'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sidebarVisible = isMobile ? mobileMenuOpen : !desktopCollapsed

  return (
    <div className="auth-layout">
      {/* Overlay mobile */}
      {isMobile && mobileMenuOpen && (
        <div
          className="auth-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          'auth-sidebar',
          isMobile
            ? (mobileMenuOpen ? 'auth-sidebar--mobile-open' : 'auth-sidebar--mobile-closed')
            : (desktopCollapsed ? 'auth-sidebar--collapsed' : 'auth-sidebar--expanded'),
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
          {sidebarVisible && (
            <span className="auth-sidebar__brand-text">Remocao Alpha</span>
          )}
        </div>

        <nav className="auth-sidebar__nav">
          <Link
            to="/"
            className={cn('auth-sidebar__nav-item', isActive('/') && 'auth-sidebar__nav-item--active')}
            onClick={closeMobile}
          >
            <span className="auth-sidebar__nav-icon"><Ambulance size={18} /></span>
            {sidebarVisible && <span className="auth-sidebar__nav-label">Central de Remocoes</span>}
          </Link>
          {hasPerm(Perm.REMOCACAO_SOLICITAR) && (
            <Link
              to="/nova-remocao"
              className={cn('auth-sidebar__nav-item', isActive('/nova-remocao') && 'auth-sidebar__nav-item--active')}
              onClick={closeMobile}
            >
              <span className="auth-sidebar__nav-icon"><Plus size={18} /></span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">Nova Remocao</span>}
            </Link>
          )}
          {hasPerm(Perm.RELATORIO_VISUALIZAR) && (
            <Link
              to="/relatorios"
              className={cn('auth-sidebar__nav-item', isActive('/relatorios') && 'auth-sidebar__nav-item--active')}
              onClick={closeMobile}
            >
              <span className="auth-sidebar__nav-icon"><FileText size={18} /></span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">Relatorios</span>}
            </Link>
          )}
          {hasPerm(Perm.DASHBOARD_VISUALIZAR) && (
            <Link
              to="/dashboard-analitico"
              className={cn('auth-sidebar__nav-item', isActive('/dashboard-analitico') && 'auth-sidebar__nav-item--active')}
              onClick={closeMobile}
            >
              <span className="auth-sidebar__nav-icon"><BarChart3 size={18} /></span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">Dashboard Analitico</span>}
            </Link>
          )}
          {hasPerm(Perm.ADMIN_USERS_MANAGE) && (
            <Link
              to="/admin"
              className={cn('auth-sidebar__nav-item', isActive('/admin') && 'auth-sidebar__nav-item--active')}
              onClick={closeMobile}
            >
              <span className="auth-sidebar__nav-icon"><Users size={18} /></span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">Gestao de Acessos</span>}
            </Link>
          )}
          {user?.is_root && (
            <Link
              to="/admin/global"
              className={cn('auth-sidebar__nav-item', isActive('/admin/global') && 'auth-sidebar__nav-item--active')}
              onClick={closeMobile}
            >
              <span className="auth-sidebar__nav-icon"><Shield size={18} /></span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">Administracao Global</span>}
            </Link>
          )}
          <Link
            to="/account"
            className={cn('auth-sidebar__nav-item', isActive('/account') && 'auth-sidebar__nav-item--active')}
            onClick={closeMobile}
          >
            <span className="auth-sidebar__nav-icon"><User size={18} /></span>
            {sidebarVisible && <span className="auth-sidebar__nav-label">Minha Conta</span>}
          </Link>
          <button
            type="button"
            className="auth-sidebar__nav-item"
            onClick={() => { toggleTheme(); closeMobile() }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            <span className="auth-sidebar__nav-icon">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>
            {sidebarVisible && <span className="auth-sidebar__nav-label">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>}
          </button>
          {/* Toggle expandir/recolher (desktop) */}
          {!isMobile && (
            <button
              type="button"
              className="auth-sidebar__nav-item"
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              aria-label={desktopCollapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!desktopCollapsed}
            >
              <span className="auth-sidebar__nav-icon">{desktopCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}</span>
              {sidebarVisible && <span className="auth-sidebar__nav-label">{desktopCollapsed ? 'Expandir' : 'Recolher'}</span>}
            </button>
          )}
        </nav>

        <div className="auth-sidebar__footer">
          <div className="auth-sidebar__user">
            <label className="auth-sidebar__avatar" title="Alterar avatar" style={{ cursor: 'pointer' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              {uploading ? (
                <span className="auth-sidebar__avatar-initial">...</span>
              ) : user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="auth-sidebar__avatar-img" />
              ) : (
                <span className="auth-sidebar__avatar-initial">{(user?.username || 'U').charAt(0).toUpperCase()}</span>
              )}
            </label>
            <div className="auth-sidebar__user-info">
              {sidebarVisible && (
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
            className={cn('auth-sidebar__signout', sidebarVisible && 'auth-sidebar__signout--label')}
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
            {sidebarVisible && <span>Encerrar sessao</span>}
          </button>
        </div>
      </aside>

      <div className="auth-layout__body">
        <header className="auth-header">
          {/* Botão de menu mobile no cabeçalho */}
          {isMobile && (
            <button
              className="auth-header__menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} />
            </button>
          )}
          <div className="auth-header__title" style={{ flex: 1, textAlign: 'center' }}>
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

      {/* Bottom nav mobile */}
      {isMobile && (
        <nav className="mobile-bottom-nav" aria-label="Navegacao principal">
          <Link to="/" className="mobile-bottom-nav__item" onClick={closeMobile}>
            <Home size={20} />
            <span>Início</span>
          </Link>
          {hasPerm(Perm.REMOCACAO_SOLICITAR) && (
            <Link to="/nova-remocao" className="mobile-bottom-nav__item" onClick={closeMobile}>
              <Plus size={20} />
              <span>Nova</span>
            </Link>
          )}
          <Link to="/account" className="mobile-bottom-nav__item" onClick={closeMobile}>
            <User size={20} />
            <span>Conta</span>
          </Link>
          <button
            type="button"
            className="mobile-bottom-nav__item"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={20} />
            <span>Menu</span>
          </button>
        </nav>
      )}
    </div>
  )
}