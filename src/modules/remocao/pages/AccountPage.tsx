import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function AccountPage() {
  const { user, loading, refreshUser } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setNome(user.username || '')
    setEmail(user.email || '')
  }, [user?.id, user?.username, user?.email])

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const normalizedName = nome.trim()
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedName.length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Informe um e-mail válido.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: updatedPerson, error: nameError } = await supabase
        .from('people')
        .update({ nome: normalizedName })
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (nameError) throw nameError
      if (!updatedPerson) {
        throw new Error('O perfil não foi atualizado. Verifique suas permissões de acesso e tente novamente.')
      }

      let emailPending = false
      if (normalizedEmail !== user.email.trim().toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: normalizedEmail })
        if (emailError) throw emailError
        emailPending = true
      }

      await refreshUser()
      setNome(normalizedName)
      if (emailPending) setEmail(normalizedEmail)
      setSuccess(
        emailPending
          ? 'Nome atualizado. A alteração do e-mail foi solicitada; confirme a mensagem enviada pelo Supabase para concluir a troca.'
          : 'Dados do perfil atualizados com sucesso.',
      )
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível atualizar o perfil.'))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos de senha.')
      return
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não corresponde.')
      return
    }
    if (!user?.email) {
      setError('Não foi possível validar a conta atual. Entre novamente e tente de novo.')
      return
    }

    setPasswordSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) throw new Error('A senha atual não confere.')

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setSuccess('Senha alterada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível alterar a senha.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="remocao-module">
        <div className="remocao-page">
          <div className="remocao-loading" role="status">
            <span className="remocao-spinner" />
            Carregando perfil…
          </div>
        </div>
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="remocao-module">
      <div className="remocao-page remocao-page--narrow">
        <header className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">Conta e segurança</p>
            <h1 className="remocao-page__title">Minha conta</h1>
            <p className="remocao-page__subtitle">
              Atualize seus dados de identificação e mantenha suas credenciais protegidas.
            </p>
          </div>
        </header>

        {error && <div className="remocao-alert remocao-alert--danger" role="alert">{error}</div>}
        {success && <div className="remocao-alert remocao-alert--success" role="status">{success}</div>}

        <section className="remocao-card remocao-account-card" aria-labelledby="account-profile-heading">
          <div className="remocao-section-heading">
            <div className="remocao-section-heading__icon"><UserRound size={18} /></div>
            <div>
              <h2 id="account-profile-heading">Dados do perfil</h2>
              <p>Informações pessoais e vínculo de acesso.</p>
            </div>
          </div>

          <dl className="remocao-account-meta">
            <div><dt>Perfil de acesso</dt><dd>{user.papel || 'Não informado'}{user.is_root ? ' · ROOT' : ''}</dd></div>
            <div><dt>Organização ativa</dt><dd>{user.activeTenant?.nome || user.tenant_nome || 'Nenhuma organização selecionada'}</dd></div>
            <div><dt>Permissões efetivas</dt><dd>{user.permissions.length}</dd></div>
          </dl>

          <form onSubmit={handleProfileUpdate} className="remocao-form-grid">
            <div className="remocao-field">
              <label htmlFor="account-name">Nome completo</label>
              <input
                id="account-name"
                name="name"
                type="text"
                autoComplete="name"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                minLength={2}
                maxLength={160}
                required
              />
            </div>
            <div className="remocao-field">
              <label htmlFor="account-email">E-mail de acesso</label>
              <input
                id="account-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <small>O Supabase pode exigir confirmação por e-mail antes de concluir a alteração.</small>
            </div>
            <div className="remocao-form-actions">
              <button className="remocao-btn remocao-btn--primary" type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </section>

        {!user.is_root && (
          <section className="remocao-card remocao-account-card" aria-labelledby="account-security-heading">
            <div className="remocao-section-heading">
              <div className="remocao-section-heading__icon"><KeyRound size={18} /></div>
              <div>
                <h2 id="account-security-heading">Segurança da conta</h2>
                <p>Altere sua senha de acesso.</p>
              </div>
            </div>
            <form onSubmit={handlePasswordChange} className="remocao-form-grid">
              <div className="remocao-field">
                <label htmlFor="current-password">Senha atual</label>
                <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </div>
              <div className="remocao-field">
                <label htmlFor="new-password">Nova senha</label>
                <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
                <small>Use pelo menos 8 caracteres.</small>
              </div>
              <div className="remocao-field">
                <label htmlFor="confirm-password">Confirmar nova senha</label>
                <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
              </div>
              <div className="remocao-form-actions">
                <button className="remocao-btn remocao-btn--secondary" type="submit" disabled={passwordSaving}>
                  <ShieldCheck size={16} />
                  {passwordSaving ? 'Alterando…' : 'Alterar senha'}
                </button>
              </div>
            </form>
          </section>
        )}


      </div>
    </div>
  )
}
