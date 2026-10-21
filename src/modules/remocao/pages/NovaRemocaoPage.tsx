import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { StatePage } from '@/modules/remocao/components/StatePage'
import { SolicitacaoRemocaoForm } from '@/modules/remocao/forms/SolicitacaoRemocaoForm'
import { useAuth } from '@/app/providers/AuthProvider'

const PLACEHOLDER_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const workflow = [
  { icon: HeartPulse, title: 'Paciente e condição clínica', description: 'Identificação, diagnóstico, precauções e necessidades assistenciais.' },
  { icon: MapPinned, title: 'Origem e destino', description: 'Unidades, setores, leito e endereço de atendimento.' },
  { icon: Truck, title: 'Transporte e prioridade', description: 'Finalidade, suporte necessário e prioridade operacional.' },
  { icon: FileText, title: 'Documentos e agendamento', description: 'Anexos clínicos autorizados e horários previstos.' },
]

export function NovaRemocaoPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (loading || !user) {
    return (
      <StatePage
        variant="loading"
        title="Preparando solicitação"
        description="Estamos validando sua sessão e o contexto de atendimento."
        showLogo
      />
    )
  }

  const tenantId = user.tenant_id
  const invalidTenant = !tenantId || tenantId === PLACEHOLDER_TENANT_ID

  if (invalidTenant) {
    return (
      <StatePage
        variant="unauthorized"
        icon={<AlertTriangle size={40} />}
        title="Unidade de atendimento não resolvida"
        description="Por segurança, não é possível criar uma remoção sem um tenant real e autorizado. Selecione uma organização válida ou solicite a correção do seu vínculo ao administrador."
      >
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="remocao-btn remocao-btn--secondary"
          >
            <ArrowLeft size={16} />
            Voltar à Central
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="remocao-btn remocao-btn--primary"
          >
            Tentar novamente
          </button>
        </div>
      </StatePage>
    )
  }

  const handleSuccess = (remocaoId: string) => {
    setError(null)
    navigate(`/remocao/${remocaoId}`)
  }

  return (
    <div className="remocao-module min-h-full">
      <div className="remocao-page">
        <nav aria-label="Trilha de navegação" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1 rounded px-1 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft size={14} />
            Central de Remoções
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-foreground">Nova solicitação</span>
        </nav>

        <section className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
              <ClipboardList size={14} />
              Central operacional
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Nova solicitação de remoção
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Registre a necessidade de transporte com os dados clínicos, a rota e a programação necessárias para a equipe operacional.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
            <Building2 size={17} className="text-primary" />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto ativo</span>
              <span className="block max-w-[260px] truncate text-sm font-semibold text-foreground">
                {user.tenant_nome || 'Organização autorizada'}
              </span>
            </div>
            <ShieldCheck size={16} className="ml-1 shrink-0 text-emerald-600" aria-label="Sessão autenticada" />
          </div>
        </section>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">A solicitação precisa de atenção</p>
              <p className="mt-1 leading-5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="form-title" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 id="form-title" className="text-base font-bold text-foreground">Dados da solicitação</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Informe os dados disponíveis. Os campos obrigatórios são identificados no formulário.
              </p>
            </div>
            <div className="p-4 sm:p-6">
              <SolicitacaoRemocaoForm
                tenantId={tenantId}
                onSuccess={handleSuccess}
                onCancel={() => navigate('/')}
                onError={(message) => setError(message)}
              />
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5" aria-label="Orientações da solicitação">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardList size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-foreground">Etapas do registro</h2>
              </div>
              <ol className="mt-4 space-y-4">
                {workflow.map(({ icon: Icon, title, description }, index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-foreground">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Antes de salvar</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    Confira a identificação do paciente, a condição clínica, a prioridade e o destino. Anexe somente documentos necessários e autorizados para esta solicitação.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <h2 className="text-xs font-bold text-foreground">Proteção operacional</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                O envio registra uma solicitação. A disponibilidade da equipe, o veículo e a execução do transporte seguem as permissões e etapas operacionais do sistema.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
