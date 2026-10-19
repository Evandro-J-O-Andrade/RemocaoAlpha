import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { RemocaoChecklist } from '@/modules/remocao/types'
import { DEFAULT_CHECKLIST } from '@/modules/remocao/checklist/defaultTemplate'

export function ChecklistForm({
  remocaoId,
  tipoTransporte,
  initialItems,
  onChecklistChange,
}: {
  remocaoId: string
  tipoTransporte?: string
  initialItems?: RemocaoChecklist[]
  onChecklistChange?: (checked: number, total: number) => void
}) {
  const [items, setItems] = useState<RemocaoChecklist[]>(initialItems || [])
  const [loading, setLoading] = useState(false)

  const applicableItems = tipoTransporte
    ? DEFAULT_CHECKLIST.filter((i) => i.tipos_aplicaveis.includes(tipoTransporte) || i.tipos_aplicaveis.includes('simple'))
    : DEFAULT_CHECKLIST

  useEffect(() => {
    const loadChecklist = async () => {
      if (remocaoId && initialItems === undefined) {
        setLoading(true)
        const { data, error } = await supabase
          .from('remocao_checklist')
          .select('*')
          .eq('remocao_id', remocaoId)

        if (!error && data) {
          if (data.length === 0) {
            const newItems: RemocaoChecklist[] = applicableItems.map((item) => ({
              id: '',
              remocao_id: remocaoId,
              secao: item.secao,
              item_key: item.item_key,
              item_label: item.item_label,
              checked: false,
              checked_by: null,
              checked_at: null,
              observacoes: null,
              created_at: '',
              updated_at: '',
            }))
            setItems(newItems)
          } else {
            setItems(data as RemocaoChecklist[])
          }
        }
        setLoading(false)
      }
    }
    loadChecklist()
  }, [remocaoId, initialItems, applicableItems])

  const toggleItem = async (item: RemocaoChecklist) => {
    const newValue = !item.checked

    if (remocaoId && item.id) {
      await supabase
        .from('remocao_checklist')
        .update({
          checked: newValue,
          checked_by: newValue ? 'current-user' : null,
          checked_at: newValue ? new Date().toISOString() : null,
        })
        .eq('id', item.id)
    }

    setItems((prev) =>
      prev.map((i) =>
        i.item_key === item.item_key
          ? { ...i, checked: newValue, checked_at: newValue ? new Date().toISOString() : null }
          : i
      )
    )

    const checked = items.filter((i) => i.checked).length + (newValue ? 1 : -1)
    if (onChecklistChange) onChecklistChange(checked, applicableItems.length)
  }

  const totalChecked = items.filter((i) => i.checked).length
  const totalItems = applicableItems.length
  const pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0

  useEffect(() => {
    if (onChecklistChange) onChecklistChange(totalChecked, totalItems)
  }, [totalChecked, totalItems])

  const secoes = ['identificacao', 'condicao_clinica', 'documentacao', 'veiculo', 'equipe'] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Checklist Pré-Saída</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">{totalChecked} de {totalItems} concluídos</span>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-gray-600">{pct}%</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Carregando checklist...</div>
      ) : (
        secoes.map((secao) => {
          const secaoItems = applicableItems.filter((i) => i.secao === secao)
          if (secaoItems.length === 0) return null

          return (
            <fieldset key={secao} className="border rounded-lg p-3">
              <legend className="px-2 text-sm font-medium text-gray-700 capitalize">
                {secao.replace('_', ' ')}
              </legend>
              <div className="space-y-2">
                {secaoItems.map((templateItem) => {
                  const checkedItem = items.find((i) => i.item_key === templateItem.item_key)
                  const isChecked = checkedItem?.checked || false

                  return (
                    <div key={templateItem.item_key} className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleItem(checkedItem || { ...templateItem } as any)}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {isChecked && <Check size={12} />}
                      </button>
                      <label className="text-sm flex-1">
                        {templateItem.item_label}
                        {templateItem.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                  )
                })}
              </div>
            </fieldset>
          )
        })
      )}
    </div>
  )
}
