import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'

const MIN_PASSWORD_LENGTH = 12

export function PasswordResetPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { requestPasswordReset, user } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Confira os dois campos.')
      return
    }

    setLoading(true)
    try {
      // O provider só deve liberar a navegação depois de confirmar a atualização
      // da senha e a remoção da exigência de troca no primeiro acesso.
      await requestPasswordReset('', newPassword)
      navigate('/', { replace: true })
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível concluir a troca de senha. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="remocao-module"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'radial-gradient(ellipse at 15% 0%, var(--rem-primary-soft), transparent 42%), var(--rem-bg)',
      }}
    >
      <section
        className="remocao-card"
        aria-labelledby="password-reset-title"
        style={{ width: 'min(100%, 480px)', padding: 'clamp(24px, 5vw, 40px)' }}
      >
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            marginBottom: 24,
            borderRadius: 14,
            color: 'var(--rem-primary)',
            background: 'var(--rem-primary-soft)',
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          A
        </div>

        <p className="remocao-eyebrow">Remoção Alpha · Segurança da conta</p>
        <h1
          id="password-reset-title"
          className="remocao-page__title"
          style={{ fontSize: 'clamp(24px, 4vw, 30px)', marginTop: 8 }}
        >
          Crie sua nova senha
        </h1>
        <p style={{ color: 'var(--rem-text-muted)', margin: '12px 0 24px' }}>
          Para proteger seu acesso, troque a senha temporária antes de continuar.
          A área operacional ficará bloqueada até a conclusão desta etapa.
        </p>

        <div
          role="note"
          style={{
            display: 'flex',
            gap: 10,
            padding: 14,
            marginBottom: 24,
            border: '1px solid var(--rem-border)',
            borderRadius: 12,
            background: 'var(--rem-surface-muted)',
            color: 'var(--rem-text-muted)',
            fontSize: 13,
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--rem-primary)', fontWeight: 800 }}>i</span>
          <span>
            Escolha uma senha exclusiva com pelo menos {MIN_PASSWORD_LENGTH} caracteres.
            Não reutilize a senha temporária nem uma senha de outro serviço.
          </span>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              padding: 12,
              marginBottom: 18,
              border: '1px solid var(--rem-danger)',
              borderRadius: 10,
              color: 'var(--rem-danger)',
              background: 'var(--rem-danger-bg)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gap: 7, marginBottom: 18 }}>
            <label htmlFor="new-password" style={{ fontWeight: 700, fontSize: 13 }}>
              Nova senha
            </label>
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              aria-invalid={Boolean(error && newPassword.length < MIN_PASSWORD_LENGTH)}
              aria-describedby="password-requirement"
              disabled={loading}
              placeholder="Digite sua nova senha"
              style={{
                width: '100%',
                minHeight: 46,
                padding: '11px 13px',
                border: '1px solid var(--rem-border-strong)',
                borderRadius: 10,
                background: 'var(--rem-surface)',
                color: 'var(--rem-text)',
              }}
            />
            <p id="password-requirement" style={{ margin: 0, color: 'var(--rem-text-muted)', fontSize: 12 }}>
              Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
            <label htmlFor="confirm-password" style={{ fontWeight: 700, fontSize: 13 }}>
              Confirme a nova senha
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              disabled={loading}
              aria-invalid={Boolean(confirmPassword && confirmPassword !== newPassword)}
              aria-describedby="confirm-password-error"
              placeholder="Digite a mesma senha novamente"
              style={{
                width: '100%',
                minHeight: 46,
                padding: '11px 13px',
                border: '1px solid var(--rem-border-strong)',
                borderRadius: 10,
                background: 'var(--rem-surface)',
                color: 'var(--rem-text)',
              }}
            />
            <p
              id="confirm-password-error"
              style={{
                minHeight: 18,
                margin: 0,
                color: confirmPassword && confirmPassword !== newPassword
                  ? 'var(--rem-danger)'
                  : 'var(--rem-text-muted)',
                fontSize: 12,
              }}
            >
              {confirmPassword && confirmPassword !== newPassword
                ? 'As senhas ainda não coincidem.'
                : ' '}
            </p>
          </div>

          <button
            type="button"
            className="remocao-btn remocao-btn--ghost"
            onClick={() => setShowPassword((visible) => !visible)}
            disabled={loading}
            aria-pressed={showPassword}
            style={{ paddingInline: 0, marginBottom: 18, minHeight: 32 }}
          >
            {showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
          </button>

          <button
            type="submit"
            className="remocao-btn remocao-btn--primary"
            disabled={loading || !newPassword || !confirmPassword}
            style={{ width: '100%', minHeight: 46 }}
          >
            {loading ? 'Protegendo sua conta…' : 'Salvar nova senha e continuar'}
          </button>
        </form>

        <p style={{ margin: '20px 0 0', color: 'var(--rem-text-soft)', fontSize: 11, textAlign: 'center' }}>
          A navegação será liberada somente após a confirmação da troca de senha.
        </p>
      </section>
    </main>
  )
}
