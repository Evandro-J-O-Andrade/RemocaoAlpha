import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { PermissionKey } from '@/modules/remocao/permissions'
import { Perm } from '@/modules/remocao/permissions'

export interface TenantMembership {
  id: string
  tenant_id: string
  person_id: string
  papel: string
  status: string | null
  aprovado_em: string | null
  aprovado_por: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ActiveTenant {
  id: string
  nome: string
}

export interface AuthUser {
  id: string
  email: string
  username: string
  roles: string[]
  activeTenant: ActiveTenant | null
  memberships: TenantMembership[]
  permissions: PermissionKey[]
  is_root: boolean
  password_reset_required: boolean
  resolvedAt: string | null
  // Campos legados mantidos para retrocompatibilidade com componentes existentes
  tenant_id: string
  tenant_nome: string
  papel: string
}

export type AuthStage =
  | 'idle'
  | 'authenticating'
  | 'resolving_identity'
  | 'authorizing'
  | 'authenticated'
  | 'empty'
  | 'error'

export type AuthStatus = 'loading' | 'ready' | 'no_tenant' | 'unauthorized' | 'error'

export interface AuthErrorInfo {
  stage: AuthStage
  message: string
  code?: string
  retryable: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  stage: AuthStage
  status: AuthStatus
  error: AuthErrorInfo | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  checkPasswordReset: () => Promise<boolean>
  requestPasswordReset: (currentPassword: string, newPassword: string) => Promise<void>
  clearError: () => void
  setActiveTenant: (tenantId: string) => Promise<void>
  memberships: TenantMembership[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function makeAuthError(
  stage: AuthStage,
  message: string,
  opts: { code?: string; retryable?: boolean } = {}
): AuthErrorInfo {
  return {
    stage,
    message,
    code: opts.code,
    retryable: opts.retryable ?? false,
  }
}

function classifyAuthError(err: any): AuthErrorInfo {
  const message = err?.message || ''
  const status = err?.status
  const lower = message.toLowerCase()

  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('connection')) {
    return makeAuthError('authenticating', 'Falha de conexão. Verifique sua internet e tente novamente.', { retryable: true })
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return makeAuthError('authenticating', 'Tempo esgotado. O serviço demorou demais para responder.', { retryable: true })
  }

  if (status === 503 || lower.includes('unavailable') || lower.includes('service unavailable')) {
    return makeAuthError('authenticating', 'Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde.', { retryable: true })
  }

  if (status === 400 || lower.includes('invalid login') || lower.includes('credenciais') || lower.includes('email not confirmed')) {
    return makeAuthError('authenticating', 'E-mail ou senha inválidos. Verifique e tente novamente.', { retryable: false })
  }

  return makeAuthError('authenticating', 'Falha inesperada ao autenticar. Tente novamente.', { retryable: true })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [stage, setStage] = useState<AuthStage>('idle')
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<AuthErrorInfo | null>(null)

  const clearError = () => setError(null)

  useEffect(() => {
    const getSession = async () => {
      try {
        setStage('authenticating')
        setStatus('loading')
        setError(null)

        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()

        if (sessionErr || !session?.user) {
          setUser(null)
          setStage('empty')
          setStatus('loading')
          return
        }

        await loadUser(session.user.id, session.user.email ?? null)
      } catch (err: any) {
        setUser(null)
        setStage('error')
        setStatus('error')
        setError(makeAuthError('authenticating', err.message || 'Falha ao verificar sessão', { retryable: true }))
      }
    }

    void getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            await loadUser(session.user.id, session.user.email ?? null)
          } else {
            setUser(null)
            setStage('empty')
            setStatus('loading')
            setError(null)
          }
        } catch (err: any) {
          setUser(null)
          setStage('error')
          setStatus('error')
          setError(makeAuthError('authenticating', err.message || 'Falha na alteração de sessão', { retryable: true }))
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  async function loadUser(userId: string, emailFromAuth: string | null) {
    try {
      setStage('resolving_identity')
      setStatus('loading')

      // 1. Resolver pessoa (username via people.full_name)
      let pessoaNome = ''
      let passwordResetRequired = false
      const { data: personData, error: personErr } = await supabase
        .from('people')
        .select('nome, email, password_reset_required')
        .eq('id', userId)
        .single()

      if (!personErr && personData) {
        pessoaNome = personData.nome || ''
        passwordResetRequired = personData.password_reset_required || false
      }

      // 2. Carregar vínculos organizacionais (memberships e roles)
      let memberships: TenantMembership[] = []
      const { data: memData, error: memErr } = await supabase
        .from('tenant_memberships')
        .select('*')
        .eq('person_id', userId)

      if (!memErr && memData) {
        memberships = memData as TenantMembership[]
      }

      // 3. Resolver tenant ativo via RPC (SECURITY DEFINER, usa auth.uid())
      let activeTenant: ActiveTenant | null = null
      let tenantPapel = ''
      let tenantId = ''
      let tenantNome = ''
      let rpcIsRoot = false

      const { data: tenantInfo, error: tenantErr } = await supabase.rpc('get_current_tenant_info')

      if (!tenantErr && tenantInfo && Array.isArray(tenantInfo) && tenantInfo.length > 0) {
        const info = tenantInfo[0]
        activeTenant = { id: info.tenant_id, nome: info.tenant_nome || '' }
        tenantId = info.tenant_id
        tenantNome = info.tenant_nome || ''
        tenantPapel = info.papel || ''
        rpcIsRoot = info.is_root === true
      }

      // 4. Verificar ROOT via mecanismo confiável (is_admin_master RPC), nunca por inferencia de permissoes
      let isRoot = rpcIsRoot
      if (!isRoot) {
        const { data: rootData, error: rootErr } = await supabase.rpc('is_admin_master')
        if (!rootErr && rootData === true) {
          isRoot = true
        }
      }

      // 5. Carregar permissoes efetivas
      let permissions: PermissionKey[] = []
      if (isRoot) {
        permissions = Object.values(Perm) as PermissionKey[]
      } else {
        const { data: perms, error: permsErr } = await supabase.rpc('get_user_permissions')
        if (!permsErr && perms) {
          permissions = (perms as any[])
            .map((p) => (typeof p === 'string' ? p : p.permission_key))
            .filter(Boolean) as PermissionKey[]
        }
      }

      // 6. Determinar roles a partir dos memberships
      const roles = [...new Set(memberships.map((m) => m.papel).filter(Boolean))]

      // 7. Determinar status
      let resolvedStatus: AuthStatus
      if (isRoot) {
        resolvedStatus = 'ready'
      } else if (!activeTenant && memberships.length === 0) {
        resolvedStatus = 'no_tenant'
      } else if (permissions.length === 0) {
        resolvedStatus = 'unauthorized'
      } else {
        resolvedStatus = 'ready'
      }

      // 8. Se nao tem tenant ativo mas tem memberships, usar o primeiro como ativo
      if (!activeTenant && memberships.length > 0) {
        const first = memberships[0]
        activeTenant = { id: first.tenant_id, nome: '' }
        tenantId = first.tenant_id
        tenantPapel = first.papel
      }

      // 9. Username: people.full_name com fallback para email
      const username = pessoaNome || 'Usuário'

      // 10. Email: da identidade autenticada (Supabase Auth)
      const email = emailFromAuth || (personData?.email || '')

      const resolvedUser: AuthUser = {
        id: userId,
        email,
        username,
        roles,
        activeTenant,
        memberships,
        permissions,
        is_root: isRoot,
        password_reset_required: passwordResetRequired,
        resolvedAt: new Date().toISOString(),
        tenant_id: tenantId,
        tenant_nome: tenantNome,
        papel: tenantPapel || (roles.length > 0 ? roles[0] : ''),
      }

      setUser(resolvedUser)
      setStage('authenticated')
      setStatus(resolvedStatus)
      setError(null)
    } catch (err: any) {
      setUser(null)
      setStage('error')
      setStatus('error')
      setError(makeAuthError('resolving_identity', err.message || 'Falha ao resolver identidade', { retryable: true }))
    }
  }

  const signIn = async (email: string, password: string) => {
    setStage('authenticating')
    setStatus('loading')
    setError(null)

    let signInErr: any = null
    let session: { user: { id: string; email?: string } } | null = null

    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      signInErr = result.error
      session = result.data?.session
    } catch (err: any) {
      signInErr = err
    }

    if (signInErr) {
      const errorInfo = classifyAuthError(signInErr)
      setStage('error')
      setStatus('error')
      setError(errorInfo)
      throw signInErr
    }

    if (!session?.user) {
      const err = makeAuthError('authenticating', 'Sessão não estabelecida após autenticação', { retryable: true })
      setStage('error')
      setStatus('error')
      setError(err)
      throw new Error(err.message)
    }

    await loadUser(session.user.id, session.user.email ?? null)
  }

  const refreshUser = async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authUser) throw new Error('Não há uma sessão autenticada para atualizar o perfil.')
    await loadUser(authUser.id, authUser.email ?? null)
  }

  const signOut = async () => {
    setStage('idle')
    setStatus('loading')
    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setStage('empty')
    setStatus('loading')
  }

  const checkPasswordReset = async (): Promise<boolean> => {
    if (!user?.id) return false
    const { data, error } = await supabase
      .from('people')
      .select('password_reset_required')
      .eq('id', user.id)
      .single()
    if (error) return false
    return data?.password_reset_required || false
  }

  const requestPasswordReset = async (_currentPassword: string, newPassword: string) => {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (updateError) throw updateError

    if (user?.id) {
      const { error: resetFlagError } = await supabase.rpc('clear_password_reset_flag', {
        p_person_id: user.id,
      })
      if (resetFlagError) {
        // A senha já foi atualizada no Auth, mas a exigência de troca continua ativa.
        // Não liberar navegação nem alterar o estado local se a RPC falhar.
        throw resetFlagError
      }
      setUser((prev) => prev ? { ...prev, password_reset_required: false } : null)
    }
  }

  const setActiveTenant = async (tenantId: string) => {
    if (!user) return

    try {
      setStage('authorizing')
      setStatus('loading')

      const { error: rpcError } = await supabase.rpc('set_active_tenant', { p_tenant_id: tenantId })
      if (rpcError) throw rpcError

      const membership = user.memberships.find((m) => m.tenant_id === tenantId)
      const updatedUser: AuthUser = {
        ...user,
        activeTenant: membership
          ? { id: tenantId, nome: '' }
          : user.activeTenant,
        tenant_id: tenantId,
        tenant_nome: membership ? '' : user.tenant_nome,
        papel: membership ? membership.papel : user.papel,
        roles: membership ? [membership.papel] : user.roles,
        resolvedAt: new Date().toISOString(),
      }

      setUser(updatedUser)
      setStage('authenticated')
      setStatus('ready')
      setError(null)
    } catch (err: any) {
      setStage('error')
      setStatus('error')
      setError(makeAuthError('authorizing', err.message || 'Falha ao alternar tenant', { retryable: true }))
      throw err
    }
  }

  const loading = stage === 'authenticating' || stage === 'resolving_identity' || stage === 'authorizing'

  const value = useMemo(
    () => ({
      user,
      loading,
      stage,
      status,
      error,
      signIn,
      signOut,
      refreshUser,
      checkPasswordReset,
      requestPasswordReset,
      clearError,
      setActiveTenant,
      memberships: user?.memberships || [],
    }),
    [user, loading, stage, status, error, signIn, signOut, refreshUser, checkPasswordReset, requestPasswordReset, clearError, setActiveTenant]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const usePermissions = () => {
  const { user } = useAuth()

  const hasPermission = (perm: PermissionKey): boolean => {
    if (!user) return false
    if (user.is_root) return true
    return user.permissions.includes(perm)
  }

  const can = (perm: PermissionKey): boolean => hasPermission(perm)

  const hasAnyPermission = (perms: PermissionKey[]): boolean => {
    if (!user) return false
    if (user.is_root) return true
    return perms.some((p) => user.permissions.includes(p))
  }

  return { permissions: user?.permissions || [], hasPermission, can, hasAnyPermission, is_root: user?.is_root || false }
}
