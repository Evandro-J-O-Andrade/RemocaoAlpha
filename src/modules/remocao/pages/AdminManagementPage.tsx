import { useState, useEffect, type FormEvent } from 'react'
import { Pencil, Save, X } from 'lucide-react'
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
  const [totalCount, setTotalCount] = useState(0)
  const [editing, setEditing] = useState<TenantMembership | null>(null)
  const [editRoleId, setEditRoleId] = useState('')
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const canManageUsers = user?.permissions.includes(Perm.ADMIN_USERS_MANAGE) || user?.is_root
  const canManageRoles = user?.permissions.includes(Perm.ADMIN_ROLES_MANAGE) || user?.is_root
  const canAssignRoles = user?.permissions.includes(Perm.ADMIN_USERS_ASSIGN_ROLE) || user?.is_root
  const canManageTenants = user?.permissions.includes(Perm.ADMIN_TENANT_MANAGE) || user?.is_root

  const availableTabs: Tab[] = []
  if (canManageUsers) availableTabs.push('users')
  if (canManageRoles) availableTabs.push('roles')
  if (canManageTenants) availableTabs.push('tenants')

  const activeTab = availableTabs.includes(tab) ? tab : (availableTabs[0] || 'users')

  useEffect(() => {
    if (availableTabs.length === 0) return
    void loadData(activeTab)
  }, [activeTab, page])

  async function loadData(currentTab: Tab) {
    setLoading(true)
    setError(null)
    try {
      if (currentTab === 'users') {
        const { data, error: err, count } = await supabase
          .from('tenant_memberships')
          .select('*, person:people(nome, email), role:roles(nome, key)', { count: 'exact' })
          .order('convidado_em', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setMemberships((data as TenantMembership[]) || [])
        setTotalCount(count || 0)
      } else if (currentTab === 'roles') {
        const { data, error: err, count } = await supabase
          .from('roles')
          .select('*', { count: 'exact' })
          .order('nivel', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setRoles((data as Role[]) || [])
        setTotalCount(count || 0)
      } else if (currentTab === 'tenants') {
        const { data, error: err, count } = await supabase
          .from('tenants')
          .select('id, nome, razao_social, cnpj, email, ativo, created_at', { count: 'exact' })
          .order('nome', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (err) throw err
        setTenants((data as Tenant[]) || [])
        setTotalCount(count || 0)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = async (membership: TenantMembership) => {
    setError(null)
    setSuccess(null)
    setEditError(null)
    setEditing(membership)
    setEditRoleId(membership.role_id || '')
    const { data, error: rolesError } = await supabase
      .from('roles')
      .select('id, key, nome, descricao, nivel, sistema')
      .order('nivel', { ascending: false })
    if (rolesError) {
      setEditError('Não foi possível carregar as funções disponíveis.')
      return
    }
    setAssignableRoles((data as Role[]) || [])
  }

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing || !user || !canAssignRoles) return

    const selectedRole = assignableRoles.find((role) => role.id === editRoleId)
    const roleChanged = Boolean(editRoleId && editRoleId !== editing.role_id)
    if (!roleChanged || !selectedRole) {
      setEditError('Selecione uma função diferente para aplicar a alteração.')
      return
    }
    if (selectedRole.key === 'admin_master' && !user.is_root) {
      setEditError('Somente ROOT pode atribuir a função global admin_master.')
      return
    }
    if (editing.person_id === user.id) {
      setEditError('Não é permitido alterar a própria função por esta tela.')
      return
    }
    if (editing.papel === 'admin_master' || editing.role?.key === 'admin_master') {
      setEditError('O vínculo ROOT é protegido e não pode ser alterado por esta tela.')
      return
    }

    setEditSaving(true)
    setEditError(null)
    setError(null)
    setSuccess(null)
    try {
      if (!user.is_root) {
        const ownRole = assignableRoles.find((role) => role.key === user.papel)
        if (ownRole && selectedRole.nivel >= ownRole.nivel) {
          throw new Error('Você só pode atribuir funções de nível inferior ao seu próprio acesso.')
        }
        if (selectedRole.sistema) {
          throw new Error('Funções de sistema só podem ser atribuídas por ROOT.')
        }
      }

      const { error: membershipError } = await supabase
        .from('tenant_memberships')
        .update({ role_id: selectedRole.id, papel: selectedRole.key })
        .eq('id', editing.id)
        .eq('tenant_id', editing.tenant_id)
      if (membershipError) throw membershipError

      setEditing(null)
      setSuccess('Função do usuário atualizada.')
      await loadData('users')
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Não foi possível salvar a função.')
    } finally {
      setEditSaving(false)
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
      <div className="remocao-page remocao-admin-page">
        <div className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">CENTRAL DE CONTROLE</p>
            <h1 className="remocao-page__title">Administração</h1>
            <p className="remocao-page__subtitle">Acessos, funções e organizações do ambiente SaaS.</p>
          </div>
        </div>

        {error && (
          <div className="remocao-alert remocao-alert--danger" role="alert">{error}</div>
        )}
        {success && (
          <div className="remocao-alert remocao-alert--success" role="status">{success}</div>
        )}

        <div className="remocao-admin-tabs">
          <nav className="flex flex-wrap gap-2" aria-label="Seções administrativas">
            {availableTabs.map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(0) }}
                aria-current={activeTab === t ? 'page' : undefined}
                className={`remocao-admin-tab ${activeTab === t ? 'remocao-admin-tab--active' : ''}`}
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
            <div className="remocao-table-wrap">
              <table className="remocao-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Aprovado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="remocao-table__primary">{m.person?.nome || 'Nome não informado'}</span>
                        <span className="remocao-table__secondary">{m.person?.email || m.person_id}</span>
                      </td>
                      <td>{m.role?.nome || m.papel || 'Sem função'}</td>
                      <td><span className="remocao-status">{m.status}</span></td>
                      <td>{m.aprovado_em ? new Date(m.aprovado_em).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <div className="remocao-admin-row-actions">
                          <button
                            type="button"
                            onClick={() => void openEdit(m)}
                            className="remocao-btn remocao-btn--sm remocao-btn--ghost"
                            aria-label={`Editar função de ${m.person?.nome || m.person_id}`}
                            disabled={!canAssignRoles || m.person_id === user?.id || m.papel === 'admin_master' || m.role?.key === 'admin_master'}
                            title={!canAssignRoles ? 'Seu perfil não pode atribuir funções' : undefined}
                          >
                            <Pencil size={14} />
                            Editar função
                          </button>
                          {m.status === 'pendente' && (
                            <button
                              type="button"
                              onClick={() => void handleApprove(m.id)}
                              className="remocao-btn remocao-btn--sm remocao-btn--primary"
                            >
                              Aprovar
                            </button>
                          )}
                        </div>
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
            <div className="remocao-table-wrap">
              <table className="remocao-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Razão social</th>
                    <th>CNPJ</th>
                    <th>Status</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td><span className="remocao-table__primary">{t.nome}</span></td>
                      <td>{t.razao_social || '—'}</td>
                      <td>{t.cnpj || '—'}</td>
                      <td><span className="remocao-status">{t.ativo ? 'Ativo' : 'Inativo'}</span></td>
                      <td>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {editing && (
          <div className="remocao-admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editSaving) setEditing(null)
          }}>
            <section className="remocao-admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
              <header className="remocao-admin-modal__header">
                <div>
                  <p className="remocao-eyebrow">GESTÃO DE ACESSO</p>
                  <h2 id="edit-user-title">Editar usuário</h2>
                  <p>Atualize a identificação e, quando autorizado, a função deste vínculo.</p>
                </div>
                <button type="button" className="remocao-btn remocao-btn--ghost remocao-btn--icon" aria-label="Fechar edição" disabled={editSaving} onClick={() => setEditing(null)}>
                  <X size={18} />
                </button>
              </header>
              <form className="remocao-form-grid remocao-admin-edit-form" onSubmit={handleSaveEdit} noValidate>
                {editError && <div className="remocao-alert remocao-alert--danger" role="alert">{editError}</div>}
                <div className="remocao-admin-edit-identity">
                  <div><span>Nome completo</span><strong>{editing.person?.nome || 'Nome não informado'}</strong></div>
                  <div><span>E-mail de acesso</span><strong>{editing.person?.email || 'E-mail não informado'}</strong></div>
                </div>
                <p className="remocao-admin-edit-note">O banco atual permite que o próprio usuário altere o nome em Minha Conta, mas não concede essa alteração a administradores. Para preservar a segurança, esta tela não tenta contornar a política de acesso nem altera e-mail de autenticação.</p>
                <div className="remocao-field">
                  <label htmlFor="admin-edit-role">Função no vínculo</label>
                  <select
                    id="admin-edit-role"
                    value={editRoleId}
                    onChange={(event) => setEditRoleId(event.target.value)}
                    disabled={!canAssignRoles || editing.person_id === user?.id || editing.papel === 'admin_master' || !roles.length}
                  >
                    {assignableRoles.filter((role) => role.id === editing.role_id || user?.is_root || (!role.sistema && role.key !== 'admin_master' && role.nivel < (assignableRoles.find((ownRole) => ownRole.key === user?.papel)?.nivel ?? Number.MAX_SAFE_INTEGER))).map((role) => (
                      <option key={role.id} value={role.id}>{role.nome} · nível {role.nivel}</option>
                    ))}
                  </select>
                  {!canAssignRoles && <small>Seu perfil não pode atribuir funções.</small>}
                  {editing.person_id === user?.id && <small>Não é permitido alterar a própria função por esta tela.</small>}
                  {(editing.papel === 'admin_master' || editing.role?.key === 'admin_master') && <small>O vínculo ROOT é protegido e não pode ser alterado por esta tela.</small>}
                </div>
                <div className="remocao-form-actions">
                  <button type="button" className="remocao-btn remocao-btn--ghost" disabled={editSaving} onClick={() => setEditing(null)}>Cancelar</button>
                  <button type="submit" className="remocao-btn remocao-btn--primary" disabled={editSaving || !canAssignRoles || editing.person_id === user?.id || editing.papel === 'admin_master' || editing.role?.key === 'admin_master'}>
                    <Save size={16} />
                    {editSaving ? 'Salvando…' : 'Salvar função'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <footer className="remocao-admin-pagination">
          <span className="remocao-admin-pagination__summary">
            {totalCount === 0 ? 'Nenhum registro' : `Exibindo ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} de ${totalCount}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="remocao-btn remocao-btn--sm remocao-btn--ghost"
            >Anterior</button>
            <span className="text-sm" aria-live="polite">Página {page + 1} de {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || (page + 1) * PAGE_SIZE >= totalCount}
              className="remocao-btn remocao-btn--sm remocao-btn--ghost"
            >Próxima</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
