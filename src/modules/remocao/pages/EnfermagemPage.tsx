export default function EnfermagemPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <h1 className="text-2xl font-black text-white">Evolução de Enfermagem</h1>
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        <p className="text-sm text-slate-400">COREN auto-preenchido ao logar. Referencie médico por CRM, fisio por CREFITO, nutri por CRN.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <select className="bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-sm"><option>Médico - Busca CRM</option><option>Dr. Silva - CRM 12345/SP</option></select>
          <select className="bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-sm"><option>Fisio - CREFITO</option></select>
        </div>
        <textarea rows={5} placeholder="Evolução de enfermagem..." className="w-full mt-4 bg-[#020617] border border-white/10 rounded-xl p-3 text-sm" />
        <button className="mt-4 w-full bg-white text-black font-bold py-3 rounded-xl">Salvar Evolução - Vincula com paciente</button>
      </div>
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white">Checklist Duplo - Bate com motorista</h3>
        <p className="text-xs text-slate-400 mt-1">Seu checklist será comparado com o do motorista automaticamente.</p>
      </div>
    </div>
  )
}
