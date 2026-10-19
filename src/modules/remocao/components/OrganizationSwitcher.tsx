import { clsx } from 'clsx'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers/AuthProvider'

export function OrganizationSwitcher() {
  const { user, loading } = useAuth()
  const [tenants, setTenants] = useState<Array<{ id: string; nome: string }>>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    const loadTenants = async () => {
      if (!user?.id) return

      const { data, error } = await supabase
        .from('tenant_memberships')
        .select('tenant_id:tenants!inner(id, nome)')
        .eq('person_id', user.id)
        .eq('status', 'ativo')

      if (!error && data) {
        setTenants(data.map((m: any) => m.tenant_id).filter(Boolean))
      }
    }

    void loadTenants()
  }, [user])

  const handleSwitchTenant = async (tenantId: string) => {
    setSwitching(true)
    await supabase.rpc('set_active_tenant', { p_tenant_id: tenantId })
    window.location.reload()
  }

  if (loading || !user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="remocao-inline remocao-small remocao-muted hover:text-blue-600 font-medium"
      >
        {user.tenant_nome || user.is_root ? 'Administração ROOT' : 'Selecione a organização'}
        <ChevronDown size={14} className="ml-1" />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {tenants.map((tenant) => (
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
