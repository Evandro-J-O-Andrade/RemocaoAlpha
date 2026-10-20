import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Header } from '@/modules/remocao/components/Header'

export function AccountPage() {
  const { user, signOut, loading } = useAuth()
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
    if (user) {
      setNome(user.username || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: updateError } = await supabase
        .from('people')
        .update({ nome })
        .eq('id', user.id)
      if (updateError) throw updateError
      setSuccess('Perfil atualizado com sucesso')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos os campos são obrigatórios')
      return
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setPasswordSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateError) throw updateError
      setSuccess('Senha alterada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Minha Conta</h1>

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

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Dados do Perfil</h2>
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-medium">Papel:</span> {user.papel}
            {user.is_root && <span className="ml-2 text-red-600 font-medium">(ROOT)</span>}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-medium">Organização:</span> {user.tenant_nome || 'Nenhuma'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-medium">Permissões:</span> {user.permissions.length}
          </p>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                disabled
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>

        {!user.is_root && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Alterar Senha</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {passwordSaving ? 'Alterando...' : 'Alterar senha'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Sessão</h2>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Encerrar sessão
          </button>
        </div>
      </div>
    </div>
  )
}
