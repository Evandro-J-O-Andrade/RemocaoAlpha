import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, User, Stethoscope, AlertCircle, Clock, FileUp, FileText, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { RemocaoRepository } from '@/modules/remocao/repositories/remocaoRepository'

const solicitacaoSchema = z.object({
  paciente_nome: z.string().min(3, 'Nome do paciente é obrigatório'),
  paciente_prontuario: z.string().optional(),
  paciente_data_nascimento: z.string().optional(),
  paciente_sexo: z.enum(['masculino', 'feminino', 'outro', '']).optional(),
  paciente_diagnostico: z.string().optional(),
  paciente_condicao_clinica: z.enum(['estavel', 'instavel', 'grave', 'critico', 'emergencia']).default('estavel'),
  paciente_precaucoes: z.array(z.string()).default([]),
  paciente_alergias: z.array(z.string()).default([]),
  paciente_necessidades_especiais: z.string().optional(),

  origem_unidade_id: z.string().uuid().optional(),
  origem_setor_id: z.string().uuid().optional(),
  origem_leito: z.string().optional(),

  destino_unidade_id: z.string().uuid().optional(),
  destino_setor_id: z.string().uuid().optional(),
  destino_endereco: z.string().optional(),
  destino_contato_nome: z.string().optional(),
  destino_contato_telefone: z.string().optional(),

  finalidade: z.enum(['exame', 'procedimento', 'consulta', 'transferencia_inter_hospitalar', 'transferencia_intra_rede', 'alta_hospitalar', 'retorno_residencia', 'retorno_unidade_origem', 'outro']).default('exame'),
  prioridade: z.enum(['rotina', 'urgente', 'emergencial']).default('rotina'),
  tipo_transporte: z.enum(['simple', 'basico', 'intermediario', 'avancado', 'urgente']).optional(),
  nivel_suporte: z.enum(['basico', 'intermediario', 'avancado']).optional(),
  necessidade_medica: z.enum(['obrigatorio', 'solicitado', 'dispensado', 'nao_disponivel', 'nao_necessario']).default('nao_necessario'),
  justificativa_medica: z.string().optional(),

  data_prevista: z.string().optional(),
  horario_previsto_saida: z.string().optional(),
  horario_previsto_atendimento: z.string().optional(),
})

export type SolicitacaoFormValues = z.infer<typeof solicitacaoSchema>

export function SolicitacaoRemocaoForm({
  tenantId,
  onSuccess,
}: {
  tenantId: string
  onSuccess?: (remocaoId: string) => void
}) {
  const [unidades, setUnidades] = useState<any[]>([])
  const [setoresOrigem, setSetoresOrigem] = useState<any[]>([])
  const [setoresDestino, setSetoresDestino] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [documentos, setDocumentos] = useState<File[]>([])
  const [documentoTipo, setDocumentoTipo] = useState<'relatorio_medico' | 'documento_transferencia' | 'autorizacao_transferencia' | 'pedido_exame' | 'resultado_exame' | 'prescricao' | 'documento_administrativo' | 'outro'>('outro')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SolicitacaoFormValues>({
    resolver: zodResolver(solicitacaoSchema) as any,
    defaultValues: {
      prioridade: 'rotina',
      necessidade_medica: 'nao_necessario',
      paciente_condicao_clinica: 'estavel',
      finalidade: 'exame',
    },
  })

  const origemUnidade = watch('origem_unidade_id')
  const destinoUnidade = watch('destino_unidade_id')
  const necessidadeMedica = watch('necessidade_medica')

  useEffect(() => {
    RemocaoRepository.getUnidades(tenantId).then(({ data }) => {
      setUnidades(data || [])
    })
  }, [tenantId])

  useEffect(() => {
    if (origemUnidade) {
      supabase.from('remocao_setor').select('*').eq('unidade_id', origemUnidade).then(({ data }) => {
        setSetoresOrigem(data || [])
      })
    }
  }, [origemUnidade])

  useEffect(() => {
    if (destinoUnidade) {
      supabase.from('remocao_setor').select('*').eq('unidade_id', destinoUnidade).then(({ data }) => {
        setSetoresDestino(data || [])
      })
    }
  }, [destinoUnidade])

  // Auto-require medical justification
  useEffect(() => {
    if (necessidadeMedica === 'obrigatorio') {
      // justificativa is required
    } else if (necessidadeMedica === 'dispensado' || necessidadeMedica === 'nao_necessario') {
      // optional
    }
  }, [necessidadeMedica])

  const onSubmit = async (data: SolicitacaoFormValues) => {
    setSubmitting(true)
    setSubmitError(null)
    setSubmitNotice(null)
    const pacientePrecaucoes = JSON.stringify(data.paciente_precaucoes)
    const pacienteAlergias = JSON.stringify(data.paciente_alergias)

    const result = await RemocaoRepository.create({
      tenant_id: tenantId,
      paciente_nome: data.paciente_nome,
      paciente_prontuario: data.paciente_prontuario,
      paciente_data_nascimento: data.paciente_data_nascimento,
      paciente_sexo: data.paciente_sexo || null,
      paciente_diagnostico: data.paciente_diagnostico,
      paciente_condicao_clinica: data.paciente_condicao_clinica,
      paciente_precaucoes: pacientePrecaucoes,
      paciente_alergias: pacienteAlergias,
      paciente_necessidades_especiais: data.paciente_necessidades_especiais,
      origem_unidade_id: data.origem_unidade_id,
      origem_setor_id: data.origem_setor_id,
      origem_leito: data.origem_leito,
      destino_unidade_id: data.destino_unidade_id,
      destino_endereco: data.destino_endereco,
      destino_contato_nome: data.destino_contato_nome,
      destino_contato_telefone: data.destino_contato_telefone,
      finalidade: data.finalidade,
      prioridade: data.prioridade,
      tipo_transporte: data.tipo_transporte,
      nivel_suporte: data.nivel_suporte,
      necessidade_medica: data.necessidade_medica,
      justificativa_medica: data.justificativa_medica,
      data_prevista: data.data_prevista,
      horario_previsto_saida: data.horario_previsto_saida,
      horario_previsto_atendimento: data.horario_previsto_atendimento,
    })

    if (result.error || !result.data) {
      setSubmitting(false)
      setSubmitError(result.error?.message || 'Não foi possível criar a solicitação. Confira os dados e tente novamente.')
      return
    }

    if (documentos.length > 0) {
      const uploadErrors: string[] = []
      for (const file of documentos) {
        const upload = await RemocaoRepository.uploadDocumento(
          result.data.id,
          tenantId,
          file,
          documentoTipo,
          file.name,
        )
        if (upload.error) uploadErrors.push(`${file.name}: ${upload.error.message}`)
      }

      if (uploadErrors.length > 0) {
        setSubmitting(false)
        setSubmitError(`A remoção foi criada, mas nem todos os documentos foram enviados. ${uploadErrors.join(' | ')}. Abra a remoção criada e tente anexar os arquivos pendentes.`)
        setSubmitNotice(`Solicitação ${result.data.numero || result.data.id} criada. Verifique os documentos pendentes antes de continuar.`)
        return
      }
    }

    setSubmitting(false)
    if (onSuccess) onSuccess(result.data.id)
  }

  const handleSubmitForm = handleSubmit(onSubmit as any)

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6">
      {/* Patient section */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700 flex items-center gap-2">
          <User size={16} /> Dados do Paciente
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              {...register('paciente_nome')}
              className={`w-full px-3 py-2 border rounded ${errors.paciente_nome ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Nome completo"
            />
            {errors.paciente_nome && <span className="text-xs text-red-500">{errors.paciente_nome.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prontuário</label>
            <input type="text" {...register('paciente_prontuario')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Número do prontuário" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data de nascimento</label>
            <input type="date" {...register('paciente_data_nascimento')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sexo</label>
            <select {...register('paciente_sexo')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Diagnóstico</label>
            <input type="text" {...register('paciente_diagnostico')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="CID + descrição" />
          </div>
        </div>

        {/* Clinical condition */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1 flex items-center gap-2">
            <Stethoscope size={16} /> Condição clínica *
          </label>
          <select
            {...register('paciente_condicao_clinica')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="estavel">Estável</option>
            <option value="instavel">Instável</option>
            <option value="grave">Grave</option>
            <option value="critico">Crítico</option>
            <option value="emergencia">Emergência</option>
          </select>
        </div>

        {/* Precautions & allergies */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Precauções / Isolamento</label>
            <input type="text" {...register('paciente_precaucoes')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Digite e pressione Enter para adicionar" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alergias</label>
            <input type="text" {...register('paciente_alergias')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Digite e pressione Enter para adicionar" />
          </div>
        </div>
      </fieldset>

      {/* Origin & Destination */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700 flex items-center gap-2">
          <MapPin size={16} /> Origem e Destino
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin */}
          <div>
            <label className="block text-sm font-medium mb-1">Unidade de origem</label>
            <select {...register('origem_unidade_id')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setor de origem</label>
            <select {...register('origem_setor_id')} className="w-full px-3 py-2 border border-gray-300 rounded" disabled={!origemUnidade}>
              <option value="">Selecione</option>
              {setoresOrigem.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Leito</label>
            <input type="text" {...register('origem_leito')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium mb-1">Unidade de destino</label>
            <select {...register('destino_unidade_id')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">Selecione</option>
              {unidades.filter((u) => u.id !== origemUnidade).map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setor de destino</label>
            <select {...register('destino_setor_id')} className="w-full px-3 py-2 border border-gray-300 rounded" disabled={!destinoUnidade}>
              <option value="">Selecione</option>
              {setoresDestino.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Endereço (se externo)</label>
            <input type="text" {...register('destino_endereco')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
        </div>
      </fieldset>

      {/* Purpose & Classification */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Finalidade & Classificação</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Finalidade *</label>
            <select {...register('finalidade')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="exame">Exame externo</option>
              <option value="procedimento">Procedimento</option>
              <option value="consulta">Consulta</option>
              <option value="transferencia_inter_hospitalar">Transferência inter-hospitalar</option>
              <option value="transferencia_intra_rede">Transferência intra-rede</option>
              <option value="alta_hospitalar">Alta hospitalar</option>
              <option value="retorno_residencia">Retorno à residência</option>
              <option value="retorno_unidade_origem">Retorno à unidade de origem</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioridade *</label>
            <select {...register('prioridade')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="rotina">Rotina</option>
              <option value="urgente">Urgente</option>
              <option value="emergencial">Emergencial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de transporte</label>
            <select {...register('tipo_transporte')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">Automático</option>
              <option value="simple">Simples/eletiva</option>
              <option value="basico">Suporte básico</option>
              <option value="intermediario">Suporte intermediário</option>
              <option value="avancado">Suporte avançado</option>
              <option value="urgente">Emergencial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nível de suporte</label>
            <select {...register('nivel_suporte')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">Automático</option>
              <option value="basico">Básico</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </div>
        </div>

        {/* Medical necessity (section 1 / 23) */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> Necessidade de médico no transporte
          </label>
          <div className="flex gap-4">
            {(['obrigatorio', 'solicitado', 'dispensado', 'nao_disponivel', 'nao_necessario'] as const).map((val) => (
              <label key={val} className="flex items-center gap-2">
                <input type="radio" {...register('necessidade_medica')} value={val} className="text-blue-600" />
                <span className="text-sm capitalize">{val.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {necessidadeMedica === 'obrigatorio' || necessidadeMedica === 'dispensado' ? (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Justificativa médica *</label>
            <textarea
              {...register('justificativa_medica')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={2}
              placeholder="Descreva a necessidade ou a razão do acompanhamento médico"
            />
          </div>
        ) : null}
      </fieldset>

      {/* Scheduling */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700 flex items-center gap-2">
          <Clock size={16} /> Agendamento
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data prevista</label>
            <input type="date" {...register('data_prevista')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horário previsto de saída</label>
            <input type="time" {...register('horario_previsto_saida')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horário previsto do atendimento</label>
            <input type="time" {...register('horario_previsto_atendimento')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
        </div>
      </fieldset>

      {/* Documents */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium flex items-center gap-2">
          <FileUp size={16} /> Documentos da solicitação
        </legend>
        <p className="text-sm text-muted-foreground mb-3">
          Anexe FFA, laudos, pedidos e resultados de exames. Os arquivos serão enviados ao armazenamento privado após a criação da solicitação.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Categoria do documento</label>
            <select
              value={documentoTipo}
              onChange={(event) => setDocumentoTipo(event.target.value as typeof documentoTipo)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded"
            >
              <option value="relatorio_medico">Relatório médico / FFA</option>
              <option value="documento_transferencia">Documento de transferência</option>
              <option value="autorizacao_transferencia">Autorização de transferência</option>
              <option value="pedido_exame">Pedido de exame</option>
              <option value="resultado_exame">Resultado de exame / ECG / RX</option>
              <option value="prescricao">Prescrição</option>
              <option value="documento_administrativo">Documento administrativo</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Selecionar arquivos</label>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              disabled={submitting}
              onChange={(event) => {
                const incoming = Array.from(event.target.files || [])
                const valid: File[] = []
                const rejected: string[] = []
                for (const file of incoming) {
                  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
                    rejected.push(`${file.name}: formato não permitido`)
                  } else if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
                    rejected.push(`${file.name}: o arquivo deve ter até 20 MB`)
                  } else {
                    valid.push(file)
                  }
                }
                setDocumentos((current) => [...current, ...valid].filter((file, index, all) =>
                  all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index
                ))
                setSubmitError(rejected.length ? rejected.join(' • ') : null)
                event.target.value = ''
              }}
              className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG ou PNG · até 20 MB por arquivo.</p>
          </div>
        </div>
        {documentos.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded border border-border">
            {documentos.map((file, index) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <FileText size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  disabled={submitting}
                  onClick={() => setDocumentos((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {submitError && <div role="alert" className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</div>}
      {submitNotice && <div role="status" className="rounded border border-border bg-muted px-3 py-2 text-sm text-foreground">{submitNotice}</div>}

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : 'Solicitar Remoção'}
        </button>
      </div>
    </form>
  )
}
