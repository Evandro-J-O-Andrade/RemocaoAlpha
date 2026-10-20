import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { X, Phone, Camera, Send, Map as MapIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers/AuthProvider'
import type { RemocaoDashboardView } from '@/modules/remocao/types'
import { useGpsTracking } from '@/modules/remocao/hooks/useGpsTracking'
import { RemocaoService } from '@/modules/remocao/services/remocaoService'
import { CheckinForm } from '@/modules/remocao/forms/DriverCheckinCheckoutForm'
import { IntercorrenciaForm } from '@/modules/remocao/forms/IntercorrenciaForm'

export function DriverInterface({ remocaoId }: { remocaoId: string }) {
  const { user } = useAuth()
  const [remocao, setRemocao] = useState<RemocaoDashboardView | null>(null)
  const [step, setStep] = useState<'idle' | 'checkin' | 'in_transit' | 'arrived' | 'delivered' | 'checkout'>('idle')
  const [motoristas, setMotoristas] = useState<any[]>([])
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [showIntercorrencia, setShowIntercorrencia] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)

  const { position, startTracking } = useGpsTracking(remocaoId)

  useEffect(() => {
    if (!user) return

    const loadRemocao = async () => {
      const { data } = await supabase
        .from('remocao_dashboard')
        .select('*')
        .eq('id', remocaoId)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle()

      if (data) {
        setRemocao(data as RemocaoDashboardView)
        const status = data.status as string
        if (status === 'CHECKLIST_PENDENTE' || status === 'PRONTA_PARA_SAIDA') setStep('idle')
        if (status === 'EM_DESLOCAMENTO') setStep('in_transit')
        if (status === 'CHEGADA_DESTINO') setStep('arrived')
        if (status === 'PACIENTE_ENTREGUE') setStep('delivered')
        if (status === 'RETORNANDO') setStep('checkout')
      }
    }

    void loadRemocao()
  }, [remocaoId, user])

  useEffect(() => {
    if (!user) return

    const loadMotoristasVeiculos = async () => {
      const [{ data: mData }, { data: vData }] = await Promise.all([
        supabase.from('remocao_motorista').select('*').eq('tenant_id', user.tenant_id),
        supabase.from('remocao_veiculo').select('*').eq('tenant_id', user.tenant_id).eq('situacao', 'disponivel'),
      ])
      setMotoristas(mData || [])
      setVeiculos(vData || [])
    }

    void loadMotoristasVeiculos()
  }, [user])

  const handleCheckin = async (data: any) => {
    if (!user) return
    const result = await RemocaoService.registrarCheckin(remocaoId, data)
    if (!result.error) {
      startTracking()
      setStep('in_transit')

      await supabase.from('remocao_gps_posicao').insert({
        remocao_id: remocaoId,
        motorista_id: data.motorista_id,
        veiculo_id: data.veiculo_id,
        latitude: position?.coords.latitude || 0,
        longitude: position?.coords.longitude || 0,
        accuracy: position?.coords.accuracy || null,
        heading: position?.coords.heading || null,
        speed: position?.coords.speed || null,
        altitude: position?.coords.altitude || null,
      })

      window.location.reload()
    }
  }

  const handleRegisterIntercorrencia = async (data: any) => {
    if (!user) return
    await RemocaoService.registrarIntercorrencia({
      ...data,
      profissional_id: user.id,
      profissional_nome: user.username,
    })
    setShowIntercorrencia(false)
    window.location.reload()
  }

  const handleArrived = async () => {
    if (!user) return
    await RemocaoService.transicionarStatus(remocaoId, 'CHEGADA_DESTINO', user.id, user.tenant_id)
    setStep('arrived')
  }

  const handlePatientDelivered = async () => {
    if (!user) return
    await RemocaoService.transicionarStatus(remocaoId, 'PACIENTE_ENTREGUE', user.id, user.tenant_id)
    setStep('delivered')
  }

  const handleStartReturn = async () => {
    if (!user) return
    await RemocaoService.transicionarStatus(remocaoId, 'RETORNANDO', user.id, user.tenant_id)
    setStep('checkout')
  }

  if (!user) {
    return (
      <div className="remocao-page">
        <div className="remocao-empty">
          <span className="remocao-spinner" />
          <p className="remocao-empty__text">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!remocao) {
    return <div className="remocao-page"><div className="remocao-empty"><span className="remocao-spinner" /></div></div>
  }

  return (
    <div className="remocao-driver-app">
      <div className="remocao-driver-header">
        <div className="remocao-page">
          <h2 className="remocao-driver-header__title">🚑 Remoção #{remocao.numero}</h2>
          <p className="remocao-driver-header__subtitle">{remocao.paciente_nome} → {remocao.destino_unidade_nome || remocao.destino_endereco}</p>
        </div>
        <div className="remocao-inline" style={{ padding: '0 18px' }}>
          <StatusBadge status={getBadgeStatus(remocao.status)} size="sm" />
          <button
            onClick={() => setShowIntercorrencia(true)}
            className="remocao-icon-btn"
          >
            <span>⚠️</span>
          </button>
        </div>
      </div>

      <div className="status-indicator-bar">
        <div className="remocao-page">
          <div className="remocao-inline">
            <span className={`remocao-status remocao-small ${step === 'idle' ? 'remocao-status--ready' : 'remocao-status--cancelled'}`}>
              Check-in
            </span>
            <span className={`remocao-status remocao-small ${step === 'in_transit' ? 'remocao-status--ready' : 'remocao-status--cancelled'}`}>
              Em trânsito
            </span>
            <span className={`remocao-status remocao-small ${step === 'arrived' ? 'remocao-status--ready' : 'remocao-status--cancelled'}`}>
              Chegada
            </span>
            <span className={`remocao-status remocao-small ${step === 'delivered' ? 'remocao-status--ready' : 'remocao-status--cancelled'}`}>
              Entrega
            </span>
            <span className={`remocao-status remocao-small ${step === 'checkout' ? 'remocao-status--ready' : 'remocao-status--cancelled'}`}>
              Retorno
            </span>
          </div>
        </div>
      </div>

      <div className="remocao-driver-content">
        <div className="remocao-card">
          <div className="driver-map-container">
            <div className="remocao-map__placeholder">
              <div>
                <MapIcon size={48} className="text-gray-400" />
                <p className="remocao-empty__text">Mapa da rota será exibido aqui</p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-white p-3">
                <div className="remocao-inline" style={{ marginBottom: '6px' }}>
                  <span className="remocao-small remocao-text-muted">📍 Origem</span>
                  <span className="remocao-small remocao-text-muted">
                    🚑 {step === 'in_transit' || step === 'arrived' || step === 'delivered' ? 'Em trânsito' : 'Parado'}
                  </span>
                  <span className="remocao-small remocao-text-muted">📍 Destino</span>
                </div>
              </div>
            </div>

            <div className="remocao-gps-metrics">
              <div className="remocao-gps-metric">
                <span className="remocao-gps-metric__label">ETA</span>
                <strong className="remocao-gps-metric__value">{calculateETA(position, remocao) || '—'}</strong>
              </div>
              <div className="remocao-gps-metric">
                <span className="remocao-gps-metric__label">Distância restante</span>
                <strong className="remocao-gps-metric__value">{calculateDistance(position, remocao) || '—'}</strong>
              </div>
              <div className="remocao-gps-metric">
                <span className="remocao-gps-metric__label">Tempo de viagem</span>
                <strong className="remocao-gps-metric__value">{calculateTravelTime() || '—'}</strong>
              </div>
              <div className="remocao-gps-metric">
                <span className="remocao-gps-metric__label">Velocidade</span>
                <strong className="remocao-gps-metric__value">{Math.round((position?.coords.speed || 0) * 3.6)} km/h</strong>
                <span className="remocao-gps-metric__hint">{position?.coords.speed ? 'GPS ativo' : 'Aguardando GPS...'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="remocao-stack">
          {step === 'idle' && (
            <>
              <button
                onClick={() => setStep('checkin')}
                className="driver-step-btn btn-gradient"
              >
                🚑 INICIAR REMOÇÃO
              </button>
              <p className="remocao-empty__text" style={{ textAlign: 'center' }}>
                Pressione para iniciar o deslocamento. O GPS será ativado automaticamente.
              </p>
            </>
          )}

          {step === 'in_transit' && (
            <>
              <button
                onClick={handleArrived}
                className="driver-step-btn btn-neon-green"
              >
                📍 CHEGUEI AO DESTINO
              </button>
              <button
                onClick={() => setShowPhoto(true)}
                className="driver-step-btn btn-neon"
              >
                <Camera size={18} />
                Fotografar documento
              </button>
            </>
          )}

          {step === 'arrived' && (
            <button
              onClick={handlePatientDelivered}
              className="driver-step-btn btn-neon"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              }}
            >
              🤝 PACIENTE ENTREGUE
            </button>
          )}

          {step === 'delivered' && (
            <button
              onClick={handleStartReturn}
              className="driver-step-btn"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              }}
            >
              ↪️ INICIAR RETORNO
            </button>
          )}

          {step === 'checkout' && (
            <button
              onClick={() => setStep('idle')}
              className="driver-step-btn btn-neon"
              style={{
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              }}
            >
              🏁 FINALIZAR
            </button>
          )}
        </div>

        <div className="remocao-inline">
          <button
            onClick={() => setShowIntercorrencia(true)}
            className="quick-action-btn"
          >
            ⚠️ Intercorrência
          </button>
          <a
            href={`tel:${remocao.destino_contato_telefone || ''}`}
            className="quick-action-btn"
          >
            <Phone size={16} /> Ligar receptor
          </a>
          <a
            href={`sms:${remocao.destino_contato_telefone || ''}`}
            className="quick-action-btn"
          >
            <Send size={16} /> SMS receptor
          </a>
        </div>
      </div>

      {step === 'checkin' && (
        <div className="driver-modal">
          <div className="remocao-modal__header">
            <h3 className="remocao-modal__title">CHECK-IN DO MOTORISTA</h3>
            <button onClick={() => setStep('idle')} className="remocao-icon-btn">
              <X size={20} />
            </button>
          </div>

          <div className="remocao-modal__body">
            <CheckinForm
              remocaoId={remocao.id}
              motoristas={motoristas}
              veiculos={veiculos.filter((v) => v.situacao === 'disponivel')}
              onSubmit={handleCheckin}
            />
          </div>
        </div>
      )}

      {showIntercorrencia && (
        <div className="remocao-overlay">
          <div className="remocao-modal">
            <div className="remocao-modal__header">
              <h3 className="remocao-modal__title">Registrar Intercorrência</h3>
              <button onClick={() => setShowIntercorrencia(false)} className="remocao-icon-btn">
                <X size={20} />
              </button>
            </div>
            <div className="remocao-modal__body">
              <IntercorrenciaForm
                remocaoId={remocao.id}
                onSubmit={handleRegisterIntercorrencia}
                onCancel={() => setShowIntercorrencia(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showPhoto && (
        <div className="remocao-overlay">
          <div className="remocao-modal" style={{ background: 'transparent', border: '0', boxShadow: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <Camera size={48} className="mx-auto mb-4" />
              <h3 className="remocao-modal__title">Capturar documento</h3>
              <p className="remocao-empty__text">Use a câmera para fotografar o documento do paciente</p>
              <label
                htmlFor="photo-input"
                className="remocao-btn remocao-btn--primary"
                style={{ display: 'inline-block', margin: '14px 0' }}
              >
                Abrir câmera
              </label>
              <br />
              <input type="file" accept="image/*" capture="environment" className="hidden" id="photo-input" />
              <button
                onClick={() => setShowPhoto(false)}
                className="remocao-btn remocao-btn--ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function calculateETA(position: GeolocationPosition | null, remocao: RemocaoDashboardView): string | null {
  if (!position?.coords.latitude || !position?.coords.longitude || !remocao.destino_unidade_nome) return null
  // TODO: Implement real ETA calculation using routing API
  return null
}

function calculateDistance(position: GeolocationPosition | null, _remocao: RemocaoDashboardView): string | null {
  if (!position?.coords.latitude || !position?.coords.longitude) return null
  // TODO: Implement real distance calculation using routing API
  return null
}

function calculateTravelTime(): string | null {
  // TODO: Implement real travel time from checkin timestamp
  return null
}

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const map: Record<string, string> = {
    scheduled: 'remocao-status--scheduled',
    waiting: 'remocao-status--waiting-team',
    'in-transit': 'remocao-status--moving',
    delivered: 'remocao-status--delivered',
    critical: 'remocao-status--critical',
  }
  const cls = map[status] || 'remocao-status--scheduled'
  return <span className={clsx('remocao-status', cls, size === 'sm' ? 'remocao-small' : 'remocao-small')}>{status}</span>
}

function getBadgeStatus(status: string): string {
  const map: Record<string, string> = {
    SOLICITADA: 'scheduled',
    EM_AVALIACAO: 'info',
    AGUARDANDO_DESTINO: 'scheduled',
    DESTINO_CONFIRMADO: 'scheduled',
    AGUARDANDO_EQUIPE: 'waiting',
    EQUIPE_CONFIRMADA: 'scheduled',
    AGUARDANDO_MOTORISTA: 'waiting',
    MOTORISTA_CHECKIN: 'waiting',
    MOTORISTA_CONFIRMADO: 'scheduled',
    CHECKLIST_PENDENTE: 'scheduled',
    PRONTA_PARA_SAIDA: 'in-transit',
    EM_DESLOCAMENTO: 'in-transit',
    CHEGADA_DESTINO: 'in-transit',
    PACIENTE_ENTREGUE: 'delivered',
    RETORNANDO: 'in-transit',
    RETORNOU_UNIDADE: 'scheduled',
    ENCERRADA: 'delivered',
    CANCELADA: 'critical',
    SUSPENSA: 'waiting',
    INTERCORRENCIA: 'critical',
    NAO_REALIZADA: 'critical',
  }
  return map[status] || 'scheduled'
}
