import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { Perm } from '@/modules/remocao/permissions'

interface ReportCard {
  id: string
  title: string
  description: string
  scope: string
  permission: string
  path: string
}

const REPORTS: ReportCard[] = [
  {
    id: 'remocoes-periodo',
    title: 'Remoções por período',
    description: 'Volume de remoções agrupadas por dia, semana ou mês.',
    scope: 'Operação',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-periodo',
  },
  {
    id: 'remocoes-status',
    title: 'Remoções por status',
    description: 'Distribuição das remoções por status atual.',
    scope: 'Operação',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-status',
  },
  {
    id: 'remocoes-unidade',
    title: 'Remoções por unidade',
    description: 'Volume por unidade de origem e destino.',
    scope: 'Operação',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-unidade',
  },
  {
    id: 'remocoes-transporte',
    title: 'Remoções por tipo de transporte',
    description: 'Distribuição por tipo de transporte utilizado.',
    scope: 'Operação',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-transporte',
  },
  {
    id: 'remocoes-pendentes',
    title: 'Remoções pendentes e sem atribuição',
    description: 'Remoções que aguardam equipe, motorista ou destino.',
    scope: 'Operação',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-pendentes',
  },
  {
    id: 'remocoes-canceladas',
    title: 'Cancelamentos e motivos',
    description: 'Remoções canceladas com motivo registrado.',
    scope: 'Gestão',
    permission: Perm.REMOCACAO_VISUALIZAR,
    path: '/relatorios/remocoes-canceladas',
  },
  {
    id: 'auditoria',
    title: 'Auditoria de acessos',
    description: 'Histórico de alterações de papéis, permissões e vínculos.',
    scope: 'Administração',
    permission: Perm.AUDITORIA_CONSULTAR,
    path: '/relatorios/auditoria',
  },
  {
    id: 'dashboard-analitico',
    title: 'Dashboard analítico',
    description: 'Visão gerencial consolidada com indicadores reais.',
    scope: 'Gestão',
    permission: Perm.DASHBOARD_VISUALIZAR,
    path: '/dashboard-analitico',
  },
]

export function ReportsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('')

  const allowed = REPORTS.filter((r) => user?.permissions.includes(r.permission as any) || user?.is_root)
  const filtered = filter
    ? allowed.filter((r) => r.title.toLowerCase().includes(filter.toLowerCase()) || r.scope.toLowerCase().includes(filter.toLowerCase()))
    : allowed

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <div className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">CENTRAL DE RELATÓRIOS</p>
            <h1 className="remocao-page__title">Relatórios</h1>
            <p className="remocao-page__subtitle">
              Consultas detalhadas com filtros, paginação e exportação autorizada.
            </p>
          </div>
        </div>

        <div className="remocao-field" style={{ maxWidth: 320 }}>
          <input
            type="search"
            placeholder="Buscar relatório..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="remocao-input"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="remocao-empty">
            <p className="remocao-empty__title">Nenhum relatório disponível</p>
            <p className="remocao-empty__text">Seu perfil não possui permissão para acessar relatórios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <Link key={r.id} to={r.path} className="remocao-card p-4 block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg">{r.title}</h3>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">{r.scope}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{r.description}</p>
                <span className="text-sm text-blue-600 font-medium">Abrir relatório →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
