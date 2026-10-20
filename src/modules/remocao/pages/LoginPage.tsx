import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user, loading, stage, error, clearError } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await signIn(email, password)
    } catch {
      // Erro ja tratado e armazenado em error pelo AuthProvider
    }
  }

  const isSubmitting = loading

  return (
    <div className="login-page">
      {/* Conteúdo principal: hero (65%) + card de login (35%) */}
      <div className="login-content">
        <div className="login-hero">
          <img
            className="login-hero__background"
            src={theme === 'dark' ? '/img/loginalphadark.png' : '/img/loginalphalight.png'}
            alt="Remocao Alpha"
          />
          <div className="login-hero__overlay" />
          <div className="login-hero__content">
            <p className="login-eyebrow">NEW WAVE - SISTEMA DIGITAL</p>
            <h1 className="login-title">Gestao de Remocao Alpha</h1>
            <h2 className="login-hero__subtitle">Agilidade, seguranca e controle em cada etapa da remocao.</h2>
            <div className="login-hero__stats">
              <span>Operacao</span>
              <span>Assistencia</span>
              <span>Transporte</span>
              <span>Monitoramento</span>
            </div>
            <p className="login-eyebrow--bottom">NEW WAVE · SISTEMA DIGITAL</p>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-card">
            <div className="login-card__header">
              <button
                onClick={toggleTheme}
                className="login-theme-toggle"
                aria-label="Alternar tema"
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="login-brand">
                <img
                  src="/img/logonewwave.png"
                  alt="New Wave Sistema Digital"
                  className="login-logo"
                  width={160}
                  height={64}
                />
              </div>
            </div>
            <div className="login-identity">
              <h1 className="login-welcome">Bem-vindo a sua gestao de remocao</h1>
              <p className="login-subtitle">Acesse sua conta para continuar.</p>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email" className="login-label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="usuario@email.com.br"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="login-field">
                <label htmlFor="password" className="login-label">Senha</label>
                <div className="login-password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    placeholder="senha"
                    required
                    minLength={6}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-toggle-password"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Erro inline — associado ao formulário, anunciado por leitores de tela */}
              {error && stage !== 'authenticating' && (
                <span
                  data-testid="login-error-inline"
                  role="alert"
                  className="login-error-inline"
                >
                  {error.message}
                </span>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="login-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <span className="login-button__spinner" aria-hidden="true" />
                    Entrando...
                  </>
                ) : (
                  'Entrar no sistema'
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      {/* Feedback global — fora do card, centralizado na viewport inteira */}
      <AnimatePresence>
        {error && stage !== 'authenticating' && (
          <div className="login-feedback">
            <motion.div
              key={`feedback-${error.stage}-${error.message}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="login-feedback__error"
            >
              {stage === 'empty' ? (
                <span>{error.message}</span>
              ) : (
                <>
                  <span className="login-feedback__stage">{error.stage}</span>
                  {error.message}
                  {error.retryable && (
                    <button
                      type="button"
                      className="login-feedback__retry"
                      onClick={() => {
                        clearError()
                        if (email && password) {
                          void signIn(email, password)
                        }
                      }}
                    >
                      Tentar novamente
                    </button>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading global — indicador compacto, centralizado na viewport inteira */}
      {isSubmitting && (
        <div className="login-feedback">
          <div className="login-feedback__loading">
            <span className="login-feedback__stage">Autenticando</span>
            <span className="login-feedback__message">Validando acesso...</span>
            <div className="login-feedback__progress">
              <div className="login-feedback__progress-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Footer global — largura total, faixa discreta */}
      <footer className="login-footer">
        <div className="login-footer__content">
          <span className="login-footer__left">Todos os direitos reservados</span>
          <span className="login-footer__right">
            Desenvolvido por{' '}
            <a
              href="https://newwavesistemasdigital.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="login-footer__link"
            >
              New Wave Sistemas Digital
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
