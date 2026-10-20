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
}

export function AdminManagementPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'users' | 'roles' | 'tenants'>('users')
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canManage = user?.permissions.includes(Perm.ADMIN_USERS_MANAGE) ||
                    user?.permissions.includes(Perm.ADMIN_ROLES_MANAGE) ||
                    user?.is_root

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: memData, error: memErr }, { data: roleData, error: roleErr }] = await Promise.all([
        supabase.from('tenant_memberships').select('*, person:people(nome, email), role:roles(nome, key)') as any,
        supabase.from('roles').select('*'),
      ])

      if (memErr) throw memErr
      if (roleErr) throw roleErr

      setMemberships(memData || [])
      setRoles(roleData || [])
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
      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (!canManage) {
    return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
          <p className="text-red-600">Acesso negado. Você não tem permissão para gerenciar o sistema.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Administração</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                tab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Usuários
            </button>
            <button
              onClick={() => setTab('roles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                tab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Funções
            </button>
            <button
              onClick={() => setTab('tenants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                tab === 'tenants' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Organizações
            </button>
          </nav>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : tab === 'users' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprovado em</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {memberships.map((m) => (
                  <tr key={m.id}>
                    <td className="px-6 py-4 text-sm">
                      {(m as any).person?.email || m.person_id}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {m.papel || (m as any).role?.key}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{m.status}</td>
                    <td className="px-6 py-4 text-sm">
                      {m.aprovado_em ? new Date(m.aprovado_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {m.status === 'pendente' && (
                        <button
                          onClick={() => handleApprove(m.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
        ) : tab === 'roles' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-4">
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
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {memberships.map((m) => (
                  <tr key={m.tenant_id}>
                    <td className="px-6 py-4 text-sm">{m.tenant_id}</td>
                    <td className="px-6 py-4 text-sm">{(m as any).tenant?.nome || m.tenant_id}</td>
                    <td className="px-6 py-4 text-sm">{m.status}</td>
                    <td className="px-6 py-4 text-sm">{new Date(m.convidado_em).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
