import { useState } from 'react'
import { MapPinned, Camera, PenTool, CheckCircle2 } from 'lucide-react'

export default function MotoristaPage() {
  const [tab, setTab] = useState('rota')
  const [status, setStatus] = useState<'aceitar' | 'origem' | 'embarcado' | 'destino' | 'finalizado'>('aceitar')
  const [kmInicial, setKmInicial] = useState('')
  const [gpsOn, setGpsOn] = useState(false)

  const iniciarRota = () => {
    setGpsOn(true)
    setStatus('origem')
    alert('GPS AO VIVO ATIVADO - n8n tracking ON. Rota enviada pro Google Maps.')
  }

  return (
    <div className="lg:hidden min-h-screen bg-[#020617] flex flex-col">
      <div className="bg-[#0F172A] p-4 border-b border-white/10 sticky top-0 z-20">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-[#FACC15] font-black tracking-widest">REM-202610-AB12CD</p>
            <h2 className="text-white font-black text-lg leading-tight mt-1">Hosp. Municipal ? Instituto Alpha</h2>
            <p className="text-xs text-slate-400 mt-1">Paciente: José Silva • 68a • 123.456.789-00 • Estável • USB</p>
            <p className="text-[11px] text-emerald-400 mt-2">Equipe: Você (CNH) + Maria (COREN 12345) + Enf. Ana (COREN 67890)</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${status === 'aceitar' ? 'bg-[#FACC15] text-black' : 'bg-emerald-500 text-white'}`}>{status.toUpperCase()}</span>
        </div>
        <div className="mt-4 flex gap-2">
          {['aceitar','origem','embarcado','destino','finalizado'].map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${['aceitar','origem','embarcado','destino','finalizado'].indexOf(status) >= i ? 'bg-[#FACC15]' : 'bg-white/10'}`} />)}
        </div>
        {gpsOn && <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-full"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> GPS AO VIVO - n8n tracking ON</div>}
      </div>

      <div className="flex-1 p-4 pb-[100px] space-y-4">
        {tab === 'rota' && (
          <div className="space-y-4">
            <div className="bg-[#0F172A] border border-white/10 rounded-[20px] p-4">
              <h3 className="text-white font-bold flex items-center gap-2"><MapPinned className="w-4 h-4" /> Rota e Navegação - VT / Ambulância</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-[#020617] p-3 rounded-xl border border-white/5"><p className="text-[11px] text-slate-400">ORIGEM</p><p className="text-sm text-white mt-1">R. Dr. Vila Nova 120 - PS</p></div>
                <div className="bg-[#020617] p-3 rounded-xl border border-white/5"><p className="text-[11px] text-slate-400">DESTINO</p><p className="text-sm text-white mt-1">Instituto Alpha - UTI 2</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400">KM Inicial *</label><input value={kmInicial} onChange={(e) => setKmInicial(e.target.value)} placeholder="123.456" className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-lg font-black" /></div>
                <div><label className="text-xs text-slate-400">KM Final</label><input placeholder="--" className="w-full mt-1 bg-[#020617] border border-white/10 rounded-xl px-4 py-3.5 text-lg font-black" /></div>
              </div>
              <button onClick={() => window.open('https://waze.com/ul?q=Rua%20Dr%20Vila%20Nova%20120')} className="mt-4 w-full bg-white/10 py-3 rounded-xl text-sm font-bold">Abrir no Waze / Google Maps</button>
            </div>

            {status === 'aceitar' && <button onClick={iniciarRota} className="w-full bg-[#FACC15] text-black font-black py-5 rounded-[20px] text-lg tracking-widest">ACEITAR REMOÇÃO</button>}
            {status === 'origem' && <button onClick={() => setStatus('embarcado')} className="w-full bg-white text-black font-black py-5 rounded-[20px] text-lg">CHEGUEI NA ORIGEM</button>}
            {status === 'embarcado' && <button onClick={() => setStatus('destino')} className="w-full bg-emerald-400 text-black font-black py-5 rounded-[20px] text-lg">PACIENTE EMBARCADO - PARTIDA</button>}
            {status === 'destino' && <button onClick={() => setStatus('finalizado')} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[20px] text-lg">CHEGUEI NO DESTINO</button>}
            {status === 'finalizado' && <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex gap-3"><CheckCircle2 className="text-emerald-400" /><p className="text-sm text-emerald-200">Finalizado. Preencha relatório.</p></div>}
          </div>
        )}

        {tab === 'checklist' && (
          <div className="bg-[#0F172A] border border-white/10 rounded-[20px] p-4 space-y-3">
            <h3 className="text-white font-bold">Checklist Duplo - Bate com Enfermagem</h3>
            {['Maca travada e freio', 'Cinto paciente', 'O2 > 50% - checado', 'Desfibrilador / DEA OK', 'Documentação OK'].map((label) => (
              <label key={label} className="flex items-center gap-3 p-3.5 bg-[#020617] rounded-xl border border-white/5">
                <input type="checkbox" className="w-6 h-6 rounded" />
                <span className="text-sm text-white">{label}</span>
              </label>
            ))}
            <button className="w-full flex items-center justify-center gap-2 bg-white/10 py-3.5 rounded-xl text-sm font-bold"><Camera className="w-4 h-4" /> Foto maca / O2 / hodômetro</button>
          </div>
        )}

        {tab === 'relatorio' && (
          <div className="space-y-4">
            <div className="bg-[#0F172A] border border-white/10 rounded-[20px] p-4">
              <h3 className="text-white font-bold flex items-center gap-2"><PenTool className="w-4 h-4" /> Relatório Final - Motorista + Equipe</h3>
              <textarea rows={4} placeholder="Intercorrências, tempo, equipe que foi..." className="w-full mt-3 bg-[#020617] border border-white/10 rounded-xl p-3 text-sm" />
              <button className="w-full mt-4 bg-[#FACC15] text-black font-black py-4 rounded-xl">ENVIAR RELATÓRIO - BATE COM ENFERMAGEM</button>
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-white/10 px-4 py-3 flex justify-around z-30">
        {['rota', 'checklist', 'relatorio'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-xs font-bold uppercase ${tab === t ? 'text-[#FACC15]' : 'text-slate-400'}`}>{t}</button>
        ))}
      </nav>
    </div>
  )
}
