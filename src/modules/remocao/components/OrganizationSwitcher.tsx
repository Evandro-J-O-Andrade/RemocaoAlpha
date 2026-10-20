import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'

export function OrganizationSwitcher() {
  const { user, memberships, setActiveTenant, loading } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [switching, setSwitching] = useState(false)

  const tenants = memberships
    .filter((m) => m.status === 'ativo')
    .map((m: { id: string; tenant_id: string }) => ({ id: m.tenant_id, nome: m.tenant_id }))

  const handleSwitchTenant = async (tenantId: string) => {
    setSwitching(true)
    await setActiveTenant(tenantId)
    setSwitching(false)
  }

  if (loading || !user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="remocao-inline remocao-small remocao-muted hover:text-blue-600 font-medium"
      >
        {user.tenant_nome || user.is_root ? 'Administracao ROOT' : 'Selecionar organizacao'}
        <ChevronDown size={14} className="ml-1" />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {tenants.map((tenant: { id: string; nome: string }) => (
              <button
                key={tenant.id}
                onClick={() => handleSwitchTenant(tenant.id)}
                disabled={switching || tenant.id === user.tenant_id}
                className={clsx(
                  'block w-full text-left px-3 py-2 remocao-small',
                  tenant.id === user.tenant_id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-gray-50'
                )}
              >
                {tenant.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
