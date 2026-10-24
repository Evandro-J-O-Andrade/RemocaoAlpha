import '@/modules/remocao/remocao-form-contrast.css'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, FileText, Activity, MapPin, History, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers/AuthProvider'
import { RemocaoRepository } from '@/modules/remocao/repositories/remocaoRepository'
import { RemocaoService } from '@/modules/remocao/services/remocaoService'
import { StatusMachine } from '@/modules/remocao/services/statusMachine'
import { CheckinForm, CheckoutForm } from '@/modules/remocao/forms/DriverCheckinCheckoutForm'
import { ChecklistForm } from '@/modules/remocao/forms/ChecklistForm'
import { IntercorrenciaForm } from '@/modules/remocao/forms/IntercorrenciaForm'

import { StatusBadge } from '@/modules/remocao/components/Alert'
import { GPSMap } from '@/modules/remocao/components/GPSMap'
import type { RemocaoDashboardView } from '@/modules/remocao/types'

export function RemocaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [remocao, setRemocao] = useState<RemocaoDashboardView | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'driver' | 'intercorrencias' | 'documents' | 'audit'>('overview')
  const [motoristaData, setMotoristaData] = useState<{ motoristas: any[]; veiculos: any[] }>(({ motoristas: [], veiculos: [] }))
  const [checklistProgress, setChecklistProgress] = useState({ checked: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
    }
  }, [user, navigate, location])

  useEffect(() => {
    if (!user || !id) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setRemocao(null)

    const fetchRemocao = async () => {
      try {
        const { data, error } = await supabase
          .from('remocao_dashboard')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', user.tenant_id)
          .maybeSingle()

        if (cancelled) return

        if (error) {
          console.error('Falha ao carregar remoção:', error)
          setLoadError('Não foi possível carregar os dados desta remoção. Verifique sua conexão e tente novamente.')
          return
        }

        if (!data) {
          setLoadError('Remoção não encontrada ou sem acesso para este usuário.')
          return
        }

        setRemocao(data as RemocaoDashboardView)
      } catch (error) {
        if (!cancelled) {
          console.error('Falha inesperada ao carregar remoção:', error)
          setLoadError('Ocorreu uma falha inesperada ao carregar esta remoção.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchRemocao()
    return () => { cancelled = true }
  }, [id, user])

  useEffect(() => {
    if (!user || !id) return

    const fetchData = async () => {
      const [{ data: motoristas }, { data: veiculos }] = await Promise.all([
        RemocaoRepository.listMotoristasDisponiveis(user.tenant_id),
        RemocaoRepository.listVeiculosDisponiveis(user.tenant_id),
      ])
      setMotoristaData({ motoristas: motoristas || [], veiculos: veiculos || [] })
    }

    void fetchData()
  }, [id, user])

  const handleStatusTransition = async (newStatus: string) => {
    if (!user || !id) return
    const result = await RemocaoService.transicionarStatus(id, newStatus as any, user.id, user.tenant_id)
    if (result.error) {
      console.error(result.error)
    } else {
      window.location.reload()
    }
  }

  const handleCheckinSubmit = async (data: any) => {
    if (!user || !id) return
    await RemocaoService.registrarCheckin(id, data)
    await RemocaoService.transicionarStatus(id, 'MOTORISTA_CONFIRMADO', user.id, user.tenant_id)
    window.location.reload()
  }

  const handleCheckoutSubmit = async (data: any) => {
    if (!user || !id) return
    await RemocaoService.registrarCheckout(id, data)
    await RemocaoService.transicionarStatus(id, 'ENCERRADA', user.id, user.tenant_id)
    window.location.reload()
  }

  const handleIntercorrenciaSubmit = async (data: any) => {
    if (!user || !id) return
    await RemocaoService.registrarIntercorrencia({ ...data, profissional_id: user.id, profissional_nome: user.username })
    await RemocaoService.transicionarStatus(id, 'INTERCORRENCIA', user.id, user.tenant_id)
    window.location.reload()
  }

  const handleChecklistComplete = (checked: number, total: number) => {
    setChecklistProgress({ checked, total })
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-empty" role="status" aria-live="polite">
            <span className="remocao-spinner" />
            <p className="remocao-empty__text">Carregando remoção...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !remocao) {
    return (
      <div className="remocao-module min-h-screen">
        <div className="remocao-page">
          <div className="remocao-card" role="alert">
            <div className="remocao-card__header">
              <div>
                <h1 className="remocao-page__title">Não foi possível abrir a remoção</h1>
                <p className="remocao-text-muted" style={{ marginTop: '8px' }}>
                  {loadError || 'Remoção não encontrada ou sem acesso para este usuário.'}
                </p>
              </div>
            </div>
            <div className="remocao-inline" style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="remocao-btn remocao-btn--primary"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="remocao-btn remocao-btn--ghost"
              >
                Voltar à Central
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = StatusMachine.getConfig(remocao.status as any)

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <button
          onClick={() => navigate(-1)}
          className="remocao-btn remocao-btn--ghost remocao-btn--sm"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>

        <div className="remocao-card" style={{ marginTop: '18px' }}>
          <div className="remocao-card__header">
            <div>
              <span className="remocao-small remocao-muted">#{remocao.numero}</span>
              <h1 className="remocao-page__title" style={{ marginTop: '4px' }}>
                {remocao.titulo ? `${remocao.titulo} — ${remocao.paciente_nome}` : remocao.paciente_nome}
              </h1>
              <p className="remocao-small remocao-text-muted" style={{ marginTop: '5px' }}>Paciente: {remocao.paciente_nome}</p>
            </div>
            <StatusBadge status={getBadgeStatus(remocao.status)} />
          </div>

          <div className="remocao-inline" style={{ marginTop: '14px' }}>
            <div className="remocao-field">
              <span className="remocao-small remocao-muted">Status:</span>
              <strong>{statusConfig.label}</strong>
            </div>
            <div className="remocao-field">
              <span className="remocao-small remocao-muted">Prioridade:</span>
              <strong className="capitalize">{remocao.prioridade}</strong>
            </div>
            <div className="remocao-field">
              <span className="remocao-small remocao-muted">Classificação:</span>
              <strong>{remocao.tipo_transporte || '—'}</strong>
            </div>
            {remocao.motorista_nome && (
              <div className="remocao-field">
                <span className="remocao-small remocao-muted">Motorista:</span>
                <strong>{remocao.motorista_nome}</strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: '18px' }}>
            <div className="remocao-inline" style={{ marginBottom: '7px' }}>
              <span className="remocao-small remocao-muted">Progresso da remoção</span>
              <span className="remocao-small remocao-muted">Checklist: {checklistProgress.checked}/{checklistProgress.total}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getProgressPct(remocao.status)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="remocao-tabs">
          {[
            { key: 'overview', label: 'Visão Geral', icon: Activity },
            { key: 'checklist', label: 'Checklist', icon: FileText },
            { key: 'driver', label: 'Motorista', icon: MapPin },
            { key: 'intercorrencias', label: 'Intercorrências', icon: Activity },
            { key: 'documents', label: 'Documentos', icon: FileText },
            { key: 'audit', label: 'Auditoria', icon: History },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={clsx(
                'remocao-tab',
                activeTab === tab.key ? 'remocao-tab--active' : 'remocao-tab--inactive'
              )}
              aria-selected={activeTab === tab.key}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="remocao-card">
          {activeTab === 'overview' && <OverviewTab remocao={remocao} onTransition={handleStatusTransition} />}
          {activeTab === 'checklist' && (
            <ChecklistForm
              remocaoId={id!}
              tipoTransporte={remocao.tipo_transporte || undefined}
              onChecklistChange={handleChecklistComplete}
            />
          )}
          {activeTab === 'driver' && (
            <DriverTab
              remocao={remocao}
              motoristaData={motoristaData}
              onCheckinSubmit={handleCheckinSubmit}
              onCheckoutSubmit={handleCheckoutSubmit}
            />
          )}
          {activeTab === 'intercorrencias' && (
            <IntercorrenciasTab remocaoId={id!} onSubmit={handleIntercorrenciaSubmit} />
          )}
          {activeTab === 'documents' && <DocumentosTab remocaoId={id!} tenantId={remocao.tenant_id} />}
          {activeTab === 'audit' && <AuditoriaTab remocaoId={id!} />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ remocao, onTransition }: { remocao: RemocaoDashboardView; onTransition: (status: string) => void }) {
  return (
    <div className="remocao-stack">
      <fieldset className="remocao-section">
        <legend className="remocao-small remocao-muted" style={{ padding: '0 6px' }}>Dados do Paciente</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 remocao-small">
          <div><span className="remocao-muted">Nome:</span> {remocao.paciente_nome}</div>
          <div><span className="remocao-muted">Prontuário:</span> {remocao.paciente_prontuario || '—'}</div>
          <div><span className="remocao-muted">Condição:</span> {remocao.paciente_condicao_clinica || '—'}</div>
          <div><span className="remocao-muted">Diagnóstico:</span> {remocao.paciente_diagnostico || '—'}</div>
        </div>
      </fieldset>

      {remocao.origem_unidade_nome && (
        <fieldset className="remocao-section">
          <legend className="remocao-small remocao-muted" style={{ padding: '0 6px' }}>Origem e Destino</legend>
          <div className="grid grid-cols-2 gap-4 remocao-small">
            <div>
              <span className="remocao-muted">Origem:</span> {remocao.origem_unidade_nome}{' '}
                {remocao.origem_setor_nome && `(${remocao.origem_setor_nome})`}
            </div>
            <div>
              <span className="remocao-muted">Destino:</span> {remocao.destino_unidade_nome || remocao.destino_endereco || '—'}
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="remocao-section">
        <legend className="remocao-small remocao-muted" style={{ padding: '0 6px' }}>Agendamento</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 remocao-small">
          {remocao.horario_previsto_saida && (
            <div><span className="remocao-muted">Saída prevista:</span> {formatDateTime(remocao.horario_previsto_saida)}</div>
          )}
          {remocao.horario_previsto_atendimento && (
            <div><span className="remocao-muted">Atendimento:</span> {formatDateTime(remocao.horario_previsto_atendimento)}</div>
          )}
          <div><span className="remocao-muted">Motorista:</span> {remocao.motorista_nome || 'Não atribuído'}</div>
        </div>
      </fieldset>

      <StatusTransitionButtons status={remocao.status as any} onTransition={onTransition} />
    </div>
  )
}

function StatusTransitionButtons({ status, onTransition }: {
  status: string
  onTransition: (status: string) => void
}) {
  const validTransitions = StatusMachine.getValidTransitions(status as any)

  if (validTransitions.length === 0) return null

  return (
    <div className="remocao-inline">
      <span className="remocao-small remocao-muted">Transições próximas:</span>
      {validTransitions.map((s) => (
        <button
          key={s}
          onClick={() => onTransition(s)}
          className="remocao-btn remocao-btn--secondary remocao-btn--sm"
        >
          → {StatusMachine.getConfig(s as any).label}
        </button>
      ))}
    </div>
  )
}

function DriverTab({
  remocao,
  motoristaData,
  onCheckinSubmit,
  onCheckoutSubmit,
}: {
  remocao: RemocaoDashboardView
  motoristaData: { motoristas: any[]; veiculos: any[] }
  onCheckinSubmit: (data: any) => Promise<any>
  onCheckoutSubmit: (data: any) => Promise<any>
}) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  return (
    <div className="remocao-stack">
      <div className="remocao-between">
        <h3 className="remocao-page__title" style={{ fontSize: '15px' }}>Check-in / Check-out do Motorista</h3>
        {!showCheckin && !showCheckout && (
          <button
            onClick={() => (remocao.checkin_at ? setShowCheckout(true) : setShowCheckin(true))}
            className="remocao-btn remocao-btn--primary"
          >
            {remocao.checkin_at ? 'Novo Check-out' : 'Novo Check-in'}
          </button>
        )}
      </div>

      {showCheckin && (
        <CheckinForm
          remocaoId={remocao.id}
          motoristas={motoristaData.motoristas}
          veiculos={motoristaData.veiculos.filter((v) => v.situacao === 'disponivel')}
          onSubmit={async (data) => {
            await onCheckinSubmit(data)
            setShowCheckin(false)
          }}
        />
      )}

      {showCheckout && (
        <CheckoutForm
          remocaoId={remocao.id}
          motoristas={motoristaData.motoristas}
          veiculos={motoristaData.veiculos}
          onSubmit={async (data) => {
            await onCheckoutSubmit(data)
            setShowCheckout(false)
          }}
          kmInicial={remocao.quilometragem_inicial || undefined}
        />
      )}

      <GPSMap remocaoId={remocao.id} />
    </div>
  )
}

function IntercorrenciasTab({ remocaoId, onSubmit }: {
  remocaoId: string
  onSubmit: (data: any) => Promise<any>
}) {
  const [intercorrencias, setIntercorrencias] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase.from('remocao_intercorrencia').select('*').eq('remocao_id', remocaoId).then(({ data }) => {
      setIntercorrencias(data || [])
    })
  }, [remocaoId])

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data)
    setShowForm(false)
    const { data: newData } = await supabase.from('remocao_intercorrencia').select('*').eq('remocao_id', remocaoId)
    setIntercorrencias(newData || [])
  }

  if (showForm) {
    return <IntercorrenciaForm remocaoId={remocaoId} onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />
  }

  return (
    <div>
      <div className="remocao-between" style={{ marginBottom: '16px' }}>
        <h3 className="remocao-page__title" style={{ fontSize: '15px' }}>Intercorrências ({intercorrencias.length})</h3>
        <button onClick={() => setShowForm(true)} className="remocao-btn remocao-btn--danger remocao-btn--sm">
          Registrar Intercorrência
        </button>
      </div>
      {intercorrencias.length === 0 ? (
        <p className="remocao-text-muted">Nenhuma intercorrência registrada.</p>
      ) : (
        <div className="remocao-table-wrap">
          <table className="remocao-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Data</th>
                <th>Evento</th>
              </tr>
            </thead>
            <tbody>{intercorrencias.map((i) => (
              <tr key={i.id} className="border-b">
                <td className="py-2">{i.tipo}</td>
                <td className="py-2">{new Date(i.data_hora).toLocaleString()}</td>
                <td className="py-2">{i.evento}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DocumentosTab({ remocaoId, tenantId }: { remocaoId: string; tenantId: string }) {
  const [documentos, setDocumentos] = useState<any[]>([])

  useEffect(() => {
    supabase.from('remocao_documento').select('*').eq('remocao_id', remocaoId).then(({ data }) => {
      setDocumentos(data || [])
    })
  }, [remocaoId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await RemocaoService.uploadDocumento(remocaoId, tenantId, file, 'outro', file.name)
    const { data } = await supabase.from('remocao_documento').select('*').eq('remocao_id', remocaoId)
    setDocumentos(data || [])
  }

  return (
    <div>
      <div className="remocao-between" style={{ marginBottom: '16px' }}>
        <h3 className="remocao-page__title" style={{ fontSize: '15px' }}>Documentos ({documentos.length})</h3>
        <label className="remocao-upload remocao-upload--sm">
          Anexar Documento
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif" onChange={handleUpload} className="remocao-upload__input" />
        </label>
      </div>
      {documentos.length === 0 ? (
        <p className="remocao-text-muted">Nenhum documento anexado.</p>
      ) : (
        <div className="remocao-table-wrap">
          <table className="remocao-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Status</th>
                <th>Título</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>{documentos.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="py-2">{d.tipo || '—'}</td>
                <td className="py-2">{d.status}</td>
                <td className="py-2">{d.titulo}</td>
                <td className="py-2">
                  <button
                    onClick={async () => {
                      const { data: signedUrl } = await supabase.storage
                        .from('remocao-documentos')
                        .createSignedUrl(d.storage_path, 3600)
                      if (signedUrl?.signedUrl) {
                        window.open(signedUrl.signedUrl, '_blank')
                      }
                    }}
                    className="remocao-text--info remocao-small flex items-center gap-1"
                  >
                    <Download size={14} /> Ver
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AuditoriaTab({ remocaoId }: { remocaoId: string }) {
  const [eventos, setEventos] = useState<any[]>([])

  useEffect(() => {
    supabase.from('remocao_evento').select('*').eq('remocao_id', remocaoId).order('created_at', { ascending: false }).then(({ data }) => {
      setEventos(data || [])
    })
  }, [remocaoId])

  return (
    <div>
      <h3 className="remocao-page__title" style={{ fontSize: '15px', marginBottom: '16px' }}>Histórico de Eventos ({eventos.length})</h3>
      <div className="remocao-table-wrap">
        <table className="remocao-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Evento</th>
              <th>Descrição</th>
              <th>Nível</th>
            </tr>
          </thead>
          <tbody>{eventos.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="py-2">{new Date(e.created_at).toLocaleString()}</td>
              <td className="py-2">{e.evento}</td>
              <td className="py-2">{e.descricao || '—'}</td>
              <td className="py-2">
                <span className={`remocao-status remocao-small ${
                  e.nivel === 'critical' ? 'remocao-status--critical' :
                  e.nivel === 'warning' ? 'remocao-status--warning' : 'remocao-status--info'
                }`}>{e.nivel}</span>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getBadgeStatus(status: string): string {
  const map: Record<string, string> = {
    SOLICITADA: 'scheduled', EM_AVALIACAO: 'info', AGUARDANDO_DESTINO: 'scheduled',
    DESTINO_CONFIRMADO: 'scheduled', AGUARDANDO_EQUIPE: 'waiting-team', EQUIPE_CONFIRMADA: 'scheduled',
    AGUARDANDO_MOTORISTA: 'waiting-driver', MOTORISTA_CHECKIN: 'scheduled', MOTORISTA_CONFIRMADO: 'scheduled',
    CHECKLIST_PENDENTE: 'scheduled', PRONTA_PARA_SAIDA: 'in-transit', EM_DESLOCAMENTO: 'in-transit',
    CHEGADA_DESTINO: 'in-transit', PACIENTE_ENTREGUE: 'delivered', RETORNANDO: 'in-transit',
    RETORNOU_UNIDADE: 'scheduled', ENCERRADA: 'delivered', CANCELADA: 'cancelled',
    SUSPENSA: 'cancelled', INTERCORRENCIA: 'critical', NAO_REALIZADA: 'cancelled',
  }
  return map[status] || 'scheduled'
}

function getProgressPct(status: string): number {
  const order = ['SOLICITADA', 'EM_AVALIACAO', 'AGUARDANDO_DESTINO', 'DESTINO_CONFIRMADO',
    'AGUARDANDO_EQUIPE', 'EQUIPE_CONFIRMADA', 'AGUARDANDO_MOTORISTA', 'MOTORISTA_CONFIRMADO',
    'CHECKLIST_PENDENTE', 'PRONTA_PARA_SAIDA', 'EM_DESLOCAMENTO', 'CHEGADA_DESTINO',
    'PACIENTE_ENTREGUE', 'RETORNANDO', 'RETORNOU_UNIDADE', 'ENCERRADA']
  const idx = order.indexOf(status)
  return idx >= 0 ? Math.round((idx / (order.length - 1)) * 100) : 0
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR')
}
