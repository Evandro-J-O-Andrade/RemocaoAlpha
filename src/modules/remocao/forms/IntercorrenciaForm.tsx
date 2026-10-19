import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Phone, Stethoscope } from 'lucide-react'

const intercorrenciaSchema = z.object({
  tipo: z.enum([
    'alteracao_sinais_vitais',
    'queda',
    'deterioracao_clinica',
    'parada_cardiorrespiratoria',
    'falta_equipamento',
    'falha_equipamento',
    'falta_oxigenio',
    'acidente',
    'atraso',
    'problema_destino',
    'recusa_destino',
    'retorno_origem',
    'outro',
  ]),
  evento: z.string().min(3, 'Descrição do evento é obrigatória'),
  conduta: z.string().optional(),
  resultado: z.string().optional(),
  necessidade_acicionamento_medico: z.boolean().default(false),
  necessidade_mudanca_destino: z.boolean().default(false),
  observacoes: z.string().optional(),
})

export type IntercorrenciaFormValues = z.input<typeof intercorrenciaSchema>

const TIPO_LABELS: Record<IntercorrenciaFormValues['tipo'], string> = {
  alteracao_sinais_vitais: 'Alteração de sinais vitais',
  queda: 'Queda',
  deterioracao_clinica: 'Deterioração clínica',
  parada_cardiorrespiratoria: 'Parada cardiorrespiratória',
  falta_equipamento: 'Falta de equipamento',
  falha_equipamento: 'Falha de equipamento',
  falta_oxigenio: 'Falta de oxigênio',
  acidente: 'Acidente',
  atraso: 'Atraso',
  problema_destino: 'Problema no destino',
  recusa_destino: 'Recusa do destino',
  retorno_origem: 'Retorno à origem',
  outro: 'Outro',
}

export function IntercorrenciaForm({
  remocaoId,
  onSubmit,
  onCancel,
}: {
  remocaoId: string
  onSubmit: (data: IntercorrenciaFormValues & { remocao_id: string }) => Promise<any>
  onCancel?: () => void
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<IntercorrenciaFormValues>({
    resolver: zodResolver(intercorrenciaSchema) as any,
    defaultValues: {
      necessidade_acicionamento_medico: false,
      necessidade_mudanca_destino: false,
    },
  })

  const tipo = watch('tipo')
  const needsMedico = watch('necessidade_acicionamento_medico')
  const needsDestino = watch('necessidade_mudanca_destino')

  const isCritical = ['parada_cardiorrespiratoria', 'acidente'].includes(tipo)

  return (
     <form onSubmit={handleSubmit((data) => onSubmit({ ...data, remocao_id: remocaoId }))} className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className={isCritical ? 'text-red-600' : 'text-amber-600'} />
        <h3 className="font-bold">Registrar Intercorrência</h3>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tipo *</label>
        <select
          {...register('tipo')}
          className={`w-full px-3 py-2 border rounded ${errors.tipo ? 'border-red-500' : 'border-gray-300'}`}
        >
          {Object.entries(TIPO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.tipo && <span className="text-xs text-red-500">{errors.tipo.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Evento / Descrição *</label>
        <textarea
          {...register('evento')}
          className={`w-full px-3 py-2 border rounded ${errors.evento ? 'border-red-500' : 'border-gray-300'}`}
          rows={3}
          placeholder="Descreva o que aconteceu"
        />
        {errors.evento && <span className="text-xs text-red-500">{errors.evento.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Conduta adotada</label>
        <textarea
          {...register('conduta')}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          rows={2}
          placeholder="O que foi feito para resolver"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Resultado</label>
        <textarea
          {...register('resultado')}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          rows={2}
          placeholder="Resultado da conduta"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            {...register('necessidade_acicionamento_medico')}
            id="necessidade_acicionamento_medico"
            className="rounded"
          />
          <label htmlFor="necessidade_acicionamento_medico" className="flex items-center gap-2 text-sm">
            <Stethoscope size={16} /> Necessita acionamento médico
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            {...register('necessidade_mudanca_destino')}
            id="necessidade_mudanca_destino"
            className="rounded"
          />
          <label htmlFor="necessidade_mudanca_destino" className="flex items-center gap-2 text-sm">
            <Phone size={16} /> Necessita mudança de destino
          </label>
        </div>
      </div>

      {needsMedico && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            <strong>Atenção:</strong> Este evento requer acionamento médico imediato.
            Certifique-se de notificar a equipe clínica.
          </p>
        </div>
      )}

      {needsDestino && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3">
          <p className="text-sm text-orange-800">
            <strong>Atenção:</strong> Este evento requer atualização do destino na remoção.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50 ${isCritical ? 'bg-red-600' : 'bg-amber-600'}`}
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Intercorrência'}
        </button>
      </div>
    </form>
  )
}
