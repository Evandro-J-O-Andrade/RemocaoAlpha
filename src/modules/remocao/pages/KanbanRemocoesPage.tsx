export default function KanbanRemocoesPage() {
  const cols = [
    { id: 'solicitada', label: 'Solicitada', color: 'bg-slate-500', count: 12 },
    { id: 'em_regulacao', label: 'Em Regulação', color: 'bg-amber-500', count: 5 },
    { id: 'vaga_zero', label: 'Vaga Zero', color: 'bg-red-500', count: 3 },
    { id: 'despachada', label: 'Despachada', color: 'bg-blue-500', count: 8 },
    { id: 'em_transito', label: 'Em Trânsito - GPS ON', color: 'bg-emerald-500', count: 6 },
    { id: 'finalizada', label: 'Finalizada', color: 'bg-white', count: 34 },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Central de Remoções - Kanban Realtime</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cols.map((col) => (
          <div key={col.id} className="bg-[#0F172A] border border-white/10 rounded-2xl p-3 min-h-[500px]">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
              <p className="text-sm font-bold text-white">{col.label}</p>
              <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-full">{col.count}</span>
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#020617] border border-white/10 rounded-xl p-3">
                  <p className="text-xs font-mono text-yellow-400">REM-202610-XXX{i}</p>
                  <p className="text-sm text-white mt-1 font-bold">José Silva - 68a</p>
                  <p className="text-xs text-slate-400 mt-1">USB • VT • Vaga Zero</p>
                  <p className="text-[11px] text-slate-500 mt-2">Equipe: João (Motorista) + Maria (COREN)</p>
                  <div className="mt-3 flex gap-2">
                    <span className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded-full">VERMELHO</span>
                    <span className="text-[10px] px-2 py-1 bg-white/10 text-white rounded-full">GPS ON</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
