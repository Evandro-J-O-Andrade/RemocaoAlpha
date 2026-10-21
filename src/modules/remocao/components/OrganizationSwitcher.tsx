import { useEffect, useState } from 'react'
import { Check, ChevronDown, LoaderCircle, Building2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

interface TenantOption {
  id: string
  nome: string
}

export function OrganizationSwitcher() {
  const { user, memberships, setActiveTenant, refreshUser, loading } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || loading) return

    let cancelled = false
    const loadTenants = async () => {
      setLoadingTenants(true)
      setLoadError(null)

      try {
        const membershipTenantIds = [...new Set(
          memberships
            .filter((membership) => membership.status === 'ativo')
            .map((membership) => membership.tenant_id)
            .filter(Boolean)
        )]

        let query = supabase.from('tenants').select('id, nome').order('nome')

        // ROOT pode escolher qualquer tenant retornado pela política de acesso.
        // Usuários comuns só consultam tenants aos quais possuem vínculo ativo.
        if (!user.is_root) {
          if (membershipTenantIds.length === 0) {
            if (!cancelled) setTenants([])
            return
          }
          query = query.in('id', membershipTenantIds)
        }

        const { data, error } = await query
        if (error) throw error

        if (!cancelled) {
          setTenants((data || []).filter((tenant) => tenant.id && tenant.nome))
        }
      } catch {
        if (!cancelled) {
          setTenants([])
          setLoadError('Não foi possível carregar as organizações autorizadas.')
        }
      } finally {
        if (!cancelled) setLoadingTenants(false)
      }
    }

    void loadTenants()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.is_root, user?.tenant_id, memberships, loading])

  const currentTenantName =
    tenants.find((tenant) => tenant.id === user?.tenant_id)?.nome ||
    user?.tenant_nome ||
    (user?.is_root ? 'ROOT · selecionar organização' : 'Organização não resolvida')

  const handleSwitchTenant = async (tenantId: string) => {
    if (!user || tenantId === user.tenant_id || switching) return

    setSwitching(true)
    setSwitchError(null)

    try {
      await setActiveTenant(tenantId)
      await refreshUser()
      setShowDropdown(false)
    } catch {
      setSwitchError('Não foi possível trocar a organização. Tente novamente.')
    } finally {
      setSwitching(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown((open) => !open)}
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        className="inline-flex min-h-9 max-w-[280px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Building2 size={15} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{currentTenantName}</span>
        {switching || loadingTenants
          ? <LoaderCircle size={14} className="shrink-0 animate-spin" />
          : <ChevronDown size={14} className="shrink-0 text-muted-foreground" />}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl">
          <div className="border-b border-border px-3 py-3">
            <p className="text-xs font-bold">Organização de atendimento</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              O contexto selecionado define o escopo operacional desta sessão.
            </p>
          </div>

          {loadError && (
            <p role="alert" className="flex gap-2 px-3 py-3 text-xs text-destructive">
              <AlertCircle size={14} className="shrink-0" />
              {loadError}
            </p>
          )}

          {switchError && (
            <p role="alert" className="px-3 py-2 text-xs text-destructive">{switchError}</p>
          )}

          <div className="max-h-64 overflow-y-auto p-1.5">
            {loadingTenants ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">Carregando organizações…</p>
            ) : tenants.length === 0 && !loadError ? (
              <p className="px-3 py-4 text-xs leading-5 text-muted-foreground">
                Nenhuma organização disponível para seu perfil. Verifique seus vínculos ou as permissões de acesso.
              </p>
            ) : (
              tenants.map((tenant) => {
                const active = tenant.id === user.tenant_id
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => void handleSwitchTenant(tenant.id)}
                    disabled={switching || active}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-70"
                  >
                    <Building2 size={15} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{tenant.nome}</span>
                    {active && <Check size={15} className="shrink-0 text-primary" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
