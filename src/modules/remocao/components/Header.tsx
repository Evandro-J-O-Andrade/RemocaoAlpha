import { LogOut, User, Bell, Settings } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { OrganizationSwitcher } from '@/modules/remocao/components/OrganizationSwitcher'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="remocao-header-gradient">
      <div className="remocao-page">
        <div className="remocao-between">
          <div className="remocao-inline">
            <h1 className="remocao-page__title">HIS — Gestão de Remoção</h1>
            <nav className="hidden md:flex gap-4 text-sm">
              <a href="#" className="remocao-text-muted hover:text-blue-600 font-medium">Central de Remoções</a>
              <a href="#" className="remocao-text-muted hover:text-blue-600">Veículos</a>
              <a href="#" className="remocao-text-muted hover:text-blue-600">Motoristas</a>
              <a href="#" className="remocao-text-muted hover:text-blue-600">Auditoria</a>
            </nav>
          </div>

          <div className="remocao-inline">
            <button className="remocao-icon-btn" title="Notificações">
              <Bell size={20} />
            </button>
            <button className="remocao-icon-btn" title="Configurações">
              <Settings size={20} />
            </button>
            <div className="remocao-inline" style={{ borderLeft: '1px solid var(--rem-border)', paddingLeft: '12px' }}>
              <div style={{ width: '42px', height: '42px' }} className="remocao-avatar flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="remocao-small">
                <div className="font-medium">{user?.username || 'Usuário'}</div>
                <OrganizationSwitcher />
                <div className="remocao-text-muted">{user?.papel || 'carregando...'}</div>
              </div>
              <button
                onClick={signOut}
                className="remocao-icon-btn"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
