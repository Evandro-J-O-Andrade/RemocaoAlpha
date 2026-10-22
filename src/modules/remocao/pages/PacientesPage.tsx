import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PacienteRepository } from '@/modules/remocao/repositories/remocaoRepository'
import { useAuth } from '@/app/providers/AuthProvider'

export function PacientesPage() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id || ''
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [nasc, setNasc] = useState('')
  const [sexo, setSexo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['pacientes', tenantId, search],
    queryFn: () => PacienteRepository.list(tenantId!, { search: search || undefined, limit: 50 }),
    enabled: !!tenantId,
  })

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return PacienteRepository.update(editing, tenantId!, { nome, cpf: cpf || null, data_nascimento: nasc || null, sexo: sexo || null })
      }
      return PacienteRepository.create(tenantId!, { nome, cpf: cpf || null, data_nascimento: nasc || null, sexo: sexo || null })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pacientes'] })
      reset()
    },
  })

  const reset = () => {
    setEditing(null)
    setNome('')
    setCpf('')
    setNasc('')
    setSexo('')
  }

  const edit = (p: any) => {
    setEditing(p.id)
    setNome(p.nome)
    setCpf(p.cpf || '')
    setNasc(p.data_nascimento || '')
    setSexo(p.sexo || '')
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Pacientes</h1>
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome" className="border px-2 py-1 rounded" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-2 border p-3 rounded">
        <div className="flex gap-2 flex-wrap">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" required className="border px-2 py-1 rounded" />
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="CPF" className="border px-2 py-1 rounded" />
          <input type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={sexo} onChange={(e) => setSexo(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">Sexo</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">Outro</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">{editing ? 'Atualizar' : 'Cadastrar'}</button>
          {editing && <button type="button" onClick={reset} className="border px-3 py-1 rounded">Cancelar</button>}
        </div>
      </form>
      {isLoading ? <p>Carregando...</p> : (
        <ul className="space-y-1">
          {(data?.data || []).map((p: any) => (
            <li key={p.id} className="border p-2 rounded flex justify-between">
              <span>{p.nome} {p.cpf ? `(${p.cpf})` : ''}</span>
              <button onClick={() => edit(p)} className="text-blue-600">Editar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
