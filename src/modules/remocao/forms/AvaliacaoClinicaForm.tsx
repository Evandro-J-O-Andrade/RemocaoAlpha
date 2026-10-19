import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const avaliacaoSchema = z.object({
  enfermeiro_nome: z.string().min(1, 'Nome do enfermeiro obrigatório'),
  medico_nome: z.string().optional(),
  estado_clinico: z.enum(['estavel', 'instavel', 'grave', 'critico', 'emergencia']),
  sinais_vitais: z.object({
    pressao: z.string().optional(),
    frequencia_cardiaca: z.string().optional(),
    saturacao: z.string().optional(),
    temperatura: z.string().optional(),
    horas: z.string().optional(),
  }),
  nivel_consciencia: z.string().optional(),
  oxigenoterapia: z.boolean().default(false),
  concentracao_oxigenio: z.number({ coerce: true }).optional(),
  acesso_venoso: z.boolean().default(false),
  tipo_acesso: z.string().optional(),
  infusao: z.boolean().default(false),
  medicamento_infusao: z.string().optional(),
  ventilacao: z.boolean().default(false),
  tipo_ventilacao: z.string().optional(),
  mobilidade: z.string().optional(),
  risco_queda: z.boolean().default(false),
  necessidade_monitorizacao: z.boolean().default(false),
  necessidade_oxigenio: z.boolean().default(false),
  necessidade_medicamento_transporte: z.boolean().default(false),
  risco_deterioracao: z.boolean().default(false),
  necessidade_medica: z.boolean().default(false),
  avaliacao_medica: z.string().optional(),
})

export type AvaliacaoClinicaFormValues = z.infer<typeof avaliacaoSchema>

export function AvaliacaoClinicaForm({
  onSubmit,
  initialData,
}: {
  remocaoId: string
  onSubmit: (data: AvaliacaoClinicaFormValues) => void
  initialData?: Partial<AvaliacaoClinicaFormValues>
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AvaliacaoClinicaFormValues>({
    resolver: zodResolver(avaliacaoSchema) as any,
    defaultValues: {
      oxigenoterapia: false,
      acesso_venoso: false,
      infusao: false,
      ventilacao: false,
      risco_queda: false,
      necessidade_monitorizacao: false,
      necessidade_oxigenio: false,
      necessidade_medicamento_transporte: false,
      risco_deterioracao: false,
      necessidade_medica: false,
      sinais_vitais: {},
      ...initialData,
    },
  })

  const oxigenoterapia = watch('oxigenoterapia')
  const acessoVenoso = watch('acesso_venoso')
  const infusao = watch('infusao')
  const ventilacao = watch('ventilacao')

  const handleSubmitForm = handleSubmit((data: any) => {
    onSubmit(data)
  })

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6">
      {/* Medical evaluation header */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <span className="text-2xl">🩺</span>
        <h3 className="text-lg font-bold">Avaliação Clínica Pré-Transporte</h3>
      </div>

      {/* Clinical state */}
      <div>
        <label className="block text-sm font-medium mb-1">Estado clínico *</label>
        <select
          {...register('estado_clinico')}
          className={`w-full px-3 py-2 border rounded ${errors.estado_clinico ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="estavel">Estável</option>
          <option value="instavel">Instável</option>
          <option value="grave">Grave</option>
          <option value="critico">Crítico</option>
          <option value="emergencia">Emergência</option>
        </select>
        {errors.estado_clinico && <span className="text-xs text-red-500">{errors.estado_clinico.message}</span>}
      </div>

      {/* Vital signs */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium">Sinais Vitais</legend>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Pressão arterial</label>
            <input type="text" {...register('sinais_vitais.pressao')} placeholder="120/80" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Frequência cardíaca</label>
            <input type="text" {...register('sinais_vitais.frequencia_cardiaca')} placeholder="80 bpm" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Saturação</label>
            <input type="text" {...register('sinais_vitais.saturacao')} placeholder="98%" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Temperatura</label>
            <input type="text" {...register('sinais_vitais.temperatura')} placeholder="36.5°C" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Horas</label>
            <input type="text" {...register('sinais_vitais.horas')} placeholder="12h" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
          </div>
        </div>
      </fieldset>

      {/* Level of consciousness */}
      <div>
        <label className="block text-sm font-medium mb-1">Nível de consciência</label>
        <input type="text" {...register('nivel_consciencia')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Escala de Glasgow ou descrição" />
      </div>

      {/* Oxygen therapy */}
      <div>
        <label className="flex items-center gap-3">
          <input type="checkbox" {...register('oxigenoterapia')} id="oxigenoterapia" className="rounded" />
          <span className="text-sm font-medium">Oxigenoterapia</span>
        </label>
      </div>

      {oxigenoterapia && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Concentração de O2 (%)</label>
            <input type="number" {...register('concentracao_oxigenio', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Observações sobre O2</label>
            <input type="text" {...register('nivel_consciencia')} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Cânula nasal, cânula de boca, etc." />
          </div>
        </div>
      )}

      {/* Venous access */}
      <div className="flex items-center gap-3">
        <input type="checkbox" {...register('acesso_venoso')} id="acesso_venoso" className="rounded" />
        <label htmlFor="acesso_venoso" className="text-sm">Acesso venoso</label>
      </div>
      {acessoVenoso && (
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de acesso</label>
          <input type="text" {...register('tipo_acesso')} className="w-full px-3 py-2 border border-gray-300 rounded" />
        </div>
      )}

      {/* Infusion */}
      <div className="flex items-center gap-3">
        <input type="checkbox" {...register('infusao')} id="infusao" className="rounded" />
        <label htmlFor="infusao" className="text-sm">Infusão</label>
      </div>
      {infusao && (
        <div>
          <label className="block text-sm font-medium mb-1">Medicamento em infusão</label>
          <input type="text" {...register('medicamento_infusao')} className="w-full px-3 py-2 border border-gray-300 rounded" />
        </div>
      )}

      {/* Ventilation */}
      <div className="flex items-center gap-3">
        <input type="checkbox" {...register('ventilacao')} id="ventilacao" className="rounded" />
        <label htmlFor="ventilacao" className="text-sm">Ventilação</label>
      </div>
      {ventilacao && (
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de ventilação</label>
          <input type="text" {...register('tipo_ventilacao')} className="w-full px-3 py-2 border border-gray-300 rounded" />
        </div>
      )}

      {/* Risks and needs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('risco_queda')} id="risco_queda" className="rounded" />
          <label htmlFor="risco_queda" className="text-sm">Risco de queda</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('necessidade_monitorizacao')} id="necessidade_monitorizacao" className="rounded" />
          <label htmlFor="necessidade_monitorizacao" className="text-sm">Necessidade de monitorização</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('necessidade_oxigenio')} id="necessidade_oxigenio" className="rounded" />
          <label htmlFor="necessidade_oxigenio" className="text-sm">Necessidade de oxigênio durante transporte</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('necessidade_medicamento_transporte')} id="necessidade_medicamento_transporte" className="rounded" />
          <label htmlFor="necessidade_medicamento_transporte" className="text-sm">Necessidade de medicação durante transporte</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('risco_deterioracao')} id="risco_deterioracao" className="rounded" />
          <label htmlFor="risco_deterioracao" className="text-sm">Risco de deterioração clínica</label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" {...register('necessidade_medica')} id="necessidade_medica" className="rounded" />
          <label htmlFor="necessidade_medica" className="text-sm">Necessidade de acompanhamento médico</label>
        </div>
      </div>

      {/* Professional info */}
      <fieldset className="border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium">Profissionais</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enfermeiro *</label>
            <input type="text" {...register('enfermeiro_nome')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Médico (quando aplicável)</label>
            <input type="text" {...register('medico_nome')} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
        </div>
      </fieldset>

      {/* Medical evaluation */}
      <div>
        <label className="block text-sm font-medium mb-1">Avaliação médica / Indicação</label>
        <textarea
          {...register('avaliacao_medica')}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          rows={3}
          placeholder="Descreva a avaliação e a indicação do tipo de transporte"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Salvar Avaliação
        </button>
      </div>
    </form>
  )
}
