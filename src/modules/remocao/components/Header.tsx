import { User } from 'lucide-react'
import { OrganizationSwitcher } from '@/modules/remocao/components/OrganizationSwitcher'

export function Header() {
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

          <div className="remocao-inline remocao-header__organization">
            <OrganizationSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}
