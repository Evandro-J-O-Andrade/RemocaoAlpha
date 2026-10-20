import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Perm } from '@/modules/remocao/permissions'

interface Role {
  id: string
  key: string
  nome: string
  descricao: string | null
  nivel: number
  sistema: boolean
}

interface TenantMembership {
  id: string
  tenant_id: string
  person_id: string
  role_id: string | null
  papel: string
  status: string
  aprovado_em: string | null
  convidado_em: string
  person?: { nome: string; email: string }
  role?: { nome: string; key: string }
}

interface Tenant {
  id: string
  nome: string
  razao_social: string | null
  cnpj: string | null
  email: string | null
  ativo: boolean
  created_at: string
}

type Tab = 'users' | 'roles' | 'tenants'

const PAGE_SIZE = 10

export function AdminManagementPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('users')
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const canManageUsers = user?.permissions.includes(Perm.ADMIN_USERS_MANAGE) || user?.is_root
  const canManageRoles = user?.permissions.includes(Perm.ADMIN_ROLES_MANAGE) || user?.is_root
  const canManageTenants = user?.permissions.includes(Perm.ADMIN_TENANT_MANAGE) || user?.is_root

  const availableTabs: Tab[] = []
  if (canManageUsers) availableTabs.push('users')
  if (canManageRoles) availableTabs.push('roles')
  if (canManageTenants) availableTabs.push('tenants')

  const activeTab = availableTabs.includes(tab) ? tab : (availableTabs[0] || 'users')

  useEffect(() => {
    if (availableTabs.length === 0) return
    loadData(activeTab)
  }, [activeTab])

  async function loadData(currentTab: Tab) {
    setLoading(true)
    setError(null)
    try {
      if (currentTab === 'users') {
        const { data, error: err } = await supabase
          .from('tenant_memberships')
          .select('*, person:people(nome, email), role:roles(nome, key)')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setMemberships((data as TenantMembership[]) || [])
      } else if (currentTab === 'roles') {
        const { data, error: err } = await supabase
          .from('roles')
          .select('*')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setRoles((data as Role[]) || [])
      } else if (currentTab === 'tenants') {
        const { data, error: err } = await supabase
          .from('tenants')
          .select('id, nome, razao_social, cnpj, email, ativo, created_at')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setTenants((data as Tenant[]) || [])
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (membershipId: string) => {
    try {
      const { error } = await supabase.rpc('approve_membership', { p_membership_id: membershipId })
      if (error) throw error
      setSuccess('Usuário aprovado')
      await loadData('users')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (availableTabs.length === 0) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-empty">
            <p className="remocao-empty__title">Acesso negado</p>
            <p className="remocao-empty__text">Você não tem permissão para gerenciar o sistema.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <div className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">Administração</p>
            <h1 className="remocao-page__title">Gestão do Sistema</h1>
            <p className="remocao-page__subtitle">Gerenciamento de usuários, funções e organizações.</p>
          </div>
        </div>

        {error && (
          <div className="remocao-card mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="remocao-card mb-4">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        <div className="remocao-card mb-6">
          <nav className="flex space-x-4">
            {availableTabs.map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(0) }}
                className={`py-2 px-3 text-sm font-medium border-b-2 ${
                  activeTab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'users' ? 'Usuários' : t === 'roles' ? 'Funções' : 'Organizações'}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="remocao-empty">
            <span className="remocao-spinner" />
            <p className="remocao-empty__text">Carregando...</p>
          </div>
        ) : activeTab === 'users' ? (
          memberships.length === 0 ? (
            <div className="remocao-empty">
              <p className="remocao-empty__title">Nenhum usuário encontrado</p>
              <p className="remocao-empty__text">Não há vínculos de tenant cadastrados.</p>
            </div>
          ) : (
            <div className="remocao-card overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Função</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Aprovado em</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {memberships.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 text-sm">{m.person?.email || m.person_id}</td>
                      <td className="px-6 py-4 text-sm">{m.papel || m.role?.key}</td>
                      <td className="px-6 py-4 text-sm capitalize">{m.status}</td>
                      <td className="px-6 py-4 text-sm">
                        {m.aprovado_em ? new Date(m.aprovado_em).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {m.status === 'pendente' && (
                          <button
                            onClick={() => handleApprove(m.id)}
                            className="remocao-btn remocao-btn--sm remocao-btn--primary"
                          >
                            Aprovar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'roles' ? (
          roles.length === 0 ? (
            <div className="remocao-empty">
              <p className="remocao-empty__title">Nenhuma função encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div key={role.id} className="remocao-card p-4">
                  <h3 className="font-bold text-lg">{role.nome}</h3>
                  <p className="text-sm text-gray-500 mb-2">Key: {role.key}</p>
                  <p className="text-sm text-gray-600 mb-3">{role.descricao || 'Sem descrição'}</p>
                  {role.sistema && (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      Sistema
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          tenants.length === 0 ? (
            <div className="remocao-empty">
              <p className="remocao-empty__title">Nenhuma organização encontrada</p>
            </div>
          ) : (
            <div className="remocao-card overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Razão Social</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">CNPJ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ativo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4 text-sm">{t.nome}</td>
                      <td className="px-6 py-4 text-sm">{t.razao_social || '-'}</td>
                      <td className="px-6 py-4 text-sm">{t.cnpj || '-'}</td>
                      <td className="px-6 py-4 text-sm">{t.ativo ? 'Sim' : 'Não'}</td>
                      <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="remocao-btn remocao-btn--sm remocao-btn--ghost"
          >
            Anterior
          </button>
          <span className="text-sm py-2">Página {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="remocao-btn remocao-btn--sm remocao-btn--ghost"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}
