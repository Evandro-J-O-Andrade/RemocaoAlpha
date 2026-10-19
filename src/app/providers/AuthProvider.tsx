import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { PermissionKey } from '@/modules/remocao/permissions'

export interface AuthUser {
  id: string
  email: string
  nome: string
  tenant_id: string
  tenant_nome: string
  papel: string
  permissions: PermissionKey[]
  is_root: boolean
  password_reset_required: boolean
}

export type AuthStage =
  | 'idle'
  | 'authenticating'
  | 'resolving_identity'
  | 'authorizing'
  | 'authenticated'
  | 'empty'
  | 'error'

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
  error: AuthErrorInfo | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkPasswordReset: () => Promise<boolean>
  requestPasswordReset: (currentPassword: string, newPassword: string) => Promise<void>
  clearError: () => void
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

  // Erro de rede / conexão
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('connection')) {
    return makeAuthError('authenticating', 'Falha de conexão. Verifique sua internet e tente novamente.', { retryable: true })
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return makeAuthError('authenticating', 'Tempo esgotado. O serviço demorou demais para responder.', { retryable: true })
  }

  // Serviço indisponível (503 ou similar)
  if (status === 503 || lower.includes('unavailable') || lower.includes('service unavailable')) {
    return makeAuthError('authenticating', 'Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde.', { retryable: true })
  }

  // Credenciais inválidas (400 ou mensagem de credenciais)
  if (status === 400 || lower.includes('invalid login') || lower.includes('credenciais') || lower.includes('email not confirmed')) {
    return makeAuthError('authenticating', 'E-mail ou senha inválidos. Verifique e tente novamente.', { retryable: false })
  }

  // Erro inesperado — mensagem segura, sem detalhes internos
  return makeAuthError('authenticating', 'Falha inesperada ao autenticar. Tente novamente.', { retryable: true })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [stage, setStage] = useState<AuthStage>('idle')
  const [error, setError] = useState<AuthErrorInfo | null>(null)

  const clearError = () => setError(null)

  useEffect(() => {
    const getSession = async () => {
      try {
        setStage('authenticating')
        setError(null)

        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()

        if (sessionErr || !session?.user) {
          setUser(null)
          setStage('empty')
          return
        }

        await loadUser(session.user.id)
      } catch (err: any) {
        setUser(null)
        setStage('error')
        setError(makeAuthError('authenticating', err.message || 'Falha ao verificar sessão', { retryable: true }))
      } finally {
        if (stage !== 'authenticated' && stage !== 'empty' && stage !== 'error') {
          setStage('idle')
        }
      }
    }

    void getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            await loadUser(session.user.id)
          } else {
            setUser(null)
            setStage('empty')
            setError(null)
          }
        } catch (err: any) {
          setUser(null)
          setStage('error')
          setError(makeAuthError('authenticating', err.message || 'Falha na alteração de sessão', { retryable: true }))
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  async function loadUser(userId: string) {
    try {
      // ETAPA 02 — Identidade e contexto
      setStage('resolving_identity')

      const { data: tenantInfo, error: tenantErr } = await supabase.rpc('get_current_tenant_info')

      if (tenantErr || !tenantInfo || (tenantInfo as any[]).length === 0) {
        // Sem tenant: verificar ROOT via get_user_permissions
        const { data: perms, error: permsErr } = await supabase.rpc('get_user_permissions')
        const permissionList = (perms as any[] | null)
          ?.map((p) => (typeof p === 'string' ? p : p.permission_key))
          .filter(Boolean) as PermissionKey[]

        if (permissionList.length > 0 && !permsErr) {
          const { data: personData } = await supabase
            .from('people')
            .select('nome, email, password_reset_required')
            .eq('id', userId)
            .single()

          setStage('authorizing')
          setUser({
            id: userId,
            email: '',
            nome: personData?.nome || '',
            tenant_id: '',
            tenant_nome: '',
            papel: 'admin_master',
            permissions: permissionList,
            is_root: true,
            password_reset_required: personData?.password_reset_required || false,
          })
          setStage('authenticated')
          setError(null)
          return
        }

        setUser(null)
        setStage('empty')
        setError(makeAuthError('resolving_identity', 'Identidade não reconhecida no sistema', { retryable: false }))
        return
      }

      // ETAPA 03 — Autorização e entrada
      setStage('authorizing')

      const info = (tenantInfo as any[])[0]

      const { data: perms, error: permsErr } = await supabase.rpc('get_user_permissions')
      const permissionList = (perms as any[] | null)
        ?.map((p) => (typeof p === 'string' ? p : p.permission_key))
        .filter(Boolean) as PermissionKey[]

      const { data: personData } = await supabase
        .from('people')
        .select('password_reset_required')
        .eq('id', userId)
        .single()

      if (permsErr && !info.is_root) {
        setUser(null)
        setStage('error')
        setError(makeAuthError('authorizing', 'Falha ao carregar permissões', { retryable: true }))
        return
      }

      setStage('authenticated')
      setError(null)
      setUser({
        id: userId,
        email: info.person_email || '',
        nome: info.person_nome || '',
        tenant_id: info.tenant_id,
        tenant_nome: info.tenant_nome,
        papel: info.papel,
        permissions: permsErr ? [] : permissionList,
        is_root: info.is_root || false,
        password_reset_required: personData?.password_reset_required || false,
      })
    } catch (err: any) {
      setUser(null)
      setStage('error')
      setError(makeAuthError('resolving_identity', err.message || 'Falha ao resolver identidade', { retryable: true }))
    }
  }

  const signIn = async (email: string, password: string) => {
    setStage('authenticating')
    setError(null)

    // ETAPA 01 — Autenticação real via Supabase Auth
    let signInErr: any = null
    let session: { user: { id: string } } | null = null

    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      signInErr = result.error
      session = result.data?.session
    } catch (err: any) {
      // Exceção lançada: erro de rede, timeout, ou falha inesperada na camada de transporte
      signInErr = err
    }

    if (signInErr) {
      const errorInfo = classifyAuthError(signInErr)
      setStage('error')
      setError(errorInfo)
      throw signInErr
    }

    if (!session?.user) {
      const err = makeAuthError('authenticating', 'Sessão não estabelecida após autenticação', { retryable: true })
      setStage('error')
      setError(err)
      throw new Error(err.message)
    }

    await loadUser(session.user.id)
  }

  const signOut = async () => {
    setStage('idle')
    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setStage('empty')
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
      await supabase.rpc('clear_password_reset_flag', { p_person_id: user.id })
      setUser((prev) => prev ? { ...prev, password_reset_required: false } : null)
    }
  }

  const loading = stage === 'authenticating' || stage === 'resolving_identity' || stage === 'authorizing'

  const value = useMemo(
    () => ({
      user,
      loading,
      stage,
      error,
      signIn,
      signOut,
      checkPasswordReset,
      requestPasswordReset,
      clearError,
    }),
    [user, loading, stage, error, signIn, signOut, checkPasswordReset, requestPasswordReset, clearError]
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
