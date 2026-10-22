export default function MedicoPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <h1 className="text-2xl font-black text-white">Regulação Médica - Vaga Zero e CROSS</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <h3 className="font-bold text-red-400">Vaga Zero - Justificativa Obrigatória</h3>
          <p className="text-xs text-red-300/70 mt-1">Em SP, vaga zero libera sem aceite prévio quando risco de morte. Art. 1.2 CROSS.</p>
          <textarea rows={4} placeholder="Justificativa vaga zero - risco iminente..." className="w-full mt-3 bg-[#020617] border border-red-500/20 rounded-xl p-3 text-sm" />
          <button className="mt-3 w-full bg-red-500 text-white font-bold py-3 rounded-xl">LIBERAR VAGA ZERO</button>
        </div>
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
          <h3 className="font-bold text-white">Evolução Médica Durante Transporte</h3>
          <p className="text-xs text-slate-400">CRM auto-preenchido: Dr. Silva - CRM 12345/SP</p>
          <textarea rows={4} placeholder="Prescrição, intercorrências..." className="w-full mt-3 bg-[#020617] border border-white/10 rounded-xl p-3 text-sm" />
        </div>
      </div>
    </div>
  )
}
