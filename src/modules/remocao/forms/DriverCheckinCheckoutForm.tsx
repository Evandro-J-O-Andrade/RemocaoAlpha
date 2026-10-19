import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock } from 'lucide-react'

const checkinSchema = z.object({
  motorista_id: z.string().uuid(),
  veiculo_id: z.string().uuid(),
  quilometragem_inicial: z.number({ coerce: true }).min(0),
  observacoes: z.string().optional(),
})

const checkoutSchema = z.object({
  motorista_id: z.string().uuid(),
  veiculo_id: z.string().uuid(),
  quilometragem_final: z.number({ coerce: true }).min(0),
  retorno_com_paciente: z.boolean().default(false),
  retorno_com_equipe: z.boolean().default(false),
  intercorrencias: z.string().optional(),
  problemas_veiculo: z.string().optional(),
  observacoes: z.string().optional(),
})

type CheckinFormValues = z.input<typeof checkinSchema>
type CheckoutFormValues = z.input<typeof checkoutSchema>


export function CheckinForm({
  remocaoId,
  motoristas,
  veiculos,
  onSubmit,
  initialData,
}: {
  remocaoId: string
  motoristas: { id: string; nome: string }[]
  veiculos: { id: string; placa: string; modelo?: string }[]
  onSubmit: (data: CheckinFormValues) => Promise<any>
  initialData?: Partial<CheckinFormValues>
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: initialData,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-bold flex items-center gap-2">
        <Clock size={18} />
        CHECK-IN DO MOTORISTA
      </h3>
      <p className="text-sm text-gray-600">Remoção #{remocaoId}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Motorista *</label>
          <select
            {...register('motorista_id')}
            className={`w-full px-3 py-2 border rounded ${errors.motorista_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecione</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          {errors.motorista_id && <span className="text-xs text-red-500">{errors.motorista_id.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Veículo *</label>
          <select
            {...register('veiculo_id')}
            className={`w-full px-3 py-2 border rounded ${errors.veiculo_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecione</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} {v.modelo}</option>
            ))}
          </select>
          {errors.veiculo_id && <span className="text-xs text-red-500">{errors.veiculo_id.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quilometragem inicial *</label>
          <input
            type="number"
            {...register('quilometragem_inicial', { valueAsNumber: true })}
            className={`w-full px-3 py-2 border rounded ${errors.quilometragem_inicial ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="0"
          />
          {errors.quilometragem_inicial && <span className="text-xs text-red-500">{errors.quilometragem_inicial.message}</span>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Observações</label>
          <textarea
            {...register('observacoes')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={2}
            placeholder="Observações sobre o veículo ou condições de saída"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 w-full"
      >
        {isSubmitting ? 'Registrando...' : 'Confirmar Check-in'}
      </button>
    </form>
  )
}

export function CheckoutForm({
  remocaoId,
  motoristas,
  veiculos,
  onSubmit,
  kmInicial,
}: {
  remocaoId: string
  motoristas: { id: string; nome: string }[]
  veiculos: { id: string; placa: string; modelo?: string }[]
  onSubmit: (data: CheckoutFormValues) => Promise<any>
  kmInicial?: number
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      retorno_com_paciente: false,
      retorno_com_equipe: false,
    },
  })

  const kmFinal = watch('quilometragem_final')
  const percorrido = kmFinal && kmInicial ? kmFinal - kmInicial : 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-bold flex items-center gap-2">
        <Clock size={18} />
        CHECK-OUT DO MOTORISTA
      </h3>
      <p className="text-sm text-gray-600">Remoção #{remocaoId}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Motorista *</label>
          <select
            {...register('motorista_id')}
            className={`w-full px-3 py-2 border rounded ${errors.motorista_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecione</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Veículo *</label>
          <select
            {...register('veiculo_id')}
            className={`w-full px-3 py-2 border rounded ${errors.veiculo_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Selecione</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} {v.modelo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quilometragem final *</label>
          <input
            type="number"
            {...register('quilometragem_final', { valueAsNumber: true })}
            className={`w-full px-3 py-2 border rounded ${errors.quilometragem_final ? 'border-red-500' : 'border-gray-300'}`}
            placeholder={kmInicial?.toString() || '0'}
          />
          {kmFinal && kmInicial && percorrido >= 0 && (
            <span className="text-xs text-gray-600">Percorrido: <strong>{percorrido} km</strong></span>
          )}
        </div>

        <div className="flex items-end space-y-0">
          <div className="flex items-center gap-3">
            <input type="checkbox" {...register('retorno_com_paciente')} id="retorno_com_paciente" className="rounded" />
            <label htmlFor="retorno_com_paciente" className="text-sm">Retorno com paciente</label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <input type="checkbox" {...register('retorno_com_equipe')} id="retorno_com_equipe" className="rounded" />
            <label htmlFor="retorno_com_equipe" className="text-sm">Retorno com equipe</label>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Intercorrências</label>
          <textarea
            {...register('intercorrencias')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={2}
            placeholder="Descreva eventos ocorridos durante o transporte"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Problemas no veículo</label>
          <textarea
            {...register('problemas_veiculo')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={2}
            placeholder="Informe se houve problema no veículo"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Observações gerais</label>
          <textarea
            {...register('observacoes')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={2}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 w-full"
      >
        {isSubmitting ? 'Finalizando...' : 'Confirmar Check-out e Finalizar'}
      </button>
    </form>
  )
}
