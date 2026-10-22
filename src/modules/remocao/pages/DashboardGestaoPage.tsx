export default function DashboardGestaoPage() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Gestão de Remoção</h1>
          <p className="text-sm text-slate-400">Relatórios, equipes, faturamento SIGTAP, vaga zero, evasão e CROSS</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-white/10 rounded-xl text-sm">Exportar Sheets</button>
          <button className="px-4 py-2.5 bg-[#FACC15] text-black font-bold rounded-xl text-sm">Nova Remoção</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Mês', value: '342', sub: '+12% vs mês passado', color: 'text-white' },
          { label: 'Vaga Zero', value: '18', sub: '5.2% do total', color: 'text-red-400' },
          { label: 'Tempo Aceite Médio', value: '11min', sub: 'Meta: <15min', color: 'text-emerald-400' },
          { label: 'Evasões', value: '7', sub: '2% - precisa atenção', color: 'text-amber-400' },
          { label: 'Custo Médio SIGTAP', value: 'R$ 287', sub: 'Faturamento total R$ 98k', color: 'text-white' },
        ].map((k) => (
          <div key={k.label} className="bg-[#0F172A] border border-white/10 rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-400">{k.label}</p>
            <p className={`text-2xl font-black mt-2 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0F172A] border border-white/10 rounded-[20px] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-white">Relatório de Remoções - Últimas 50</h3>
          <input placeholder="Buscar por CPF, nome, código..." className="bg-[#020617] border border-white/10 rounded-xl px-4 py-2 text-sm w-[260px]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-widest text-slate-400 bg-[#020617]/50">
              <tr><th className="text-left p-3">Código</th><th className="text-left p-3">Paciente / CPF / Idade</th><th className="text-left p-3">Origem ? Destino</th><th className="text-left p-3">Equipe (CRM/COREN)</th><th className="text-left p-3">Status</th><th className="text-left p-3">KM</th><th className="text-left p-3">SIGTAP</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { cod: 'REM-202610-AB12CD', pac: 'José Silva / 123.456.789-00 / 68a', rota: 'Hosp. Municipal ? Instituto Alpha', equipe: 'João (CNH) + Maria (COREN 123) + Dr. Silva (CRM 456/SP)', status: 'FINALIZADA', km: '24', sigtap: '0301010072' },
                { cod: 'REM-202610-EF34GH', pac: 'Maria Souza / 987.654.321-00 / 45a', rota: 'UBS Vila ? HCor - Exame', equipe: 'VT + Técnica Ana (COREN 789)', status: 'VAGA_ZERO', km: '18', sigtap: '020101...' },
                { cod: 'REM-202610-IJ56KL', pac: 'Pedro Lima / 111.222.333-44 / 72a', rota: 'PS ? UTI - CROSS NEGADA', equipe: 'USA + Dr. Costa (CRM)', status: 'CROSS_NEGADA', km: '-', sigtap: '-' },
              ].map((r) => (
                <tr key={r.cod} className="hover:bg-white/[0.03]">
                  <td className="p-3 font-mono text-xs text-yellow-400">{r.cod}</td>
                  <td className="p-3 text-white">{r.pac}</td>
                  <td className="p-3 text-slate-300">{r.rota}</td>
                  <td className="p-3 text-xs text-slate-400">{r.equipe}</td>
                  <td className="p-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${r.status === 'FINALIZADA' ? 'bg-emerald-500/20 text-emerald-400' : r.status === 'VAGA_ZERO' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status}</span></td>
                  <td className="p-3">{r.km}</td>
                  <td className="p-3 text-xs">{r.sigtap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
