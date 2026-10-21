import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { hasEffectivePermission } from '@/modules/remocao/permissions/rbac'
import { Perm } from '@/modules/remocao/permissions'
import { clsx } from 'clsx'
import { Search, Filter, RefreshCw, Plus, BarChart3, List, Inbox, ClipboardList, Users, Ambulance, AlertCircle, CheckCircle } from 'lucide-react'
import { useRemocao } from '@/modules/remocao/context/RemocaoContext'
import { STATUS_CONFIG } from '@/modules/remocao/alerts/statusConfig'
import type { StatusRemocao } from '@/modules/remocao/types'
import { RemocaoCard } from '@/modules/remocao/components/RemocaoCard'
import { FilaOperacional } from '@/modules/remocao/components/FilaOperacional'

export function CentralRemocoesPage() {
  const { user } = useAuth()
  const canCreateRemocao = !!user && hasEffectivePermission(user.permissions, user.is_root, Perm.REMOCACAO_SOLICITAR)
  const {
    remocoes,
    filteredRemocoes,
    loading,
    summary,
    refetch,
    filter,
    setFilter,
    setSelectedRemocao,
  } = useRemocao()

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({ search: e.target.value })
  }

  const handleStatusFilter = (status: any) => {
    setFilter({ status })
  }

  return (
    <div className="remocao-module min-h-screen">
      <div className="remocao-page">
        <div className="remocao-page__header">
          <div className="remocao-page__heading">
            <p className="remocao-eyebrow">Gestão de Remoção Alpha</p>
            <h1 className="remocao-page__title">Central de Remoções</h1>
            <p className="remocao-page__subtitle">Gerenciamento de transporte de pacientes entre unidades de saúde.</p>
          </div>
          <div className="remocao-page__actions">
            <button
              onClick={() => refetch()}
              className="remocao-icon-btn"
              title="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'remocao-icon-btn',
                showFilters && 'border-blue-300 bg-blue-50'
              )}
              title="Filtros"
            >
              <Filter size={18} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              className="remocao-icon-btn"
              title={viewMode === 'cards' ? 'Visualização em tabela' : 'Visualização em cards'}
            >
              {viewMode === 'cards' ? <BarChart3 size={16} /> : <List size={16} />}
            </button>
            {canCreateRemocao && (
              <Link to="/nova-remocao" className="remocao-btn remocao-btn--primary">
                <Plus size={18} />
                Nova Remoção
              </Link>
            )}
          </div>
        </div>

        <div className="remocao-card">
          <div className="remocao-inline">
            <span className="remocao-small remocao-muted">
              Status: {filteredRemocoes.length} de {remocoes.length} remoções
            </span>
            {summary && (
              <div className="remocao-inline">
                <span className="remocao-status remocao-status--warning">
                  <span className="remocao-status__dot" />
                  <span><ClipboardList size={14} /> Programadas: {summary.total_programadas}</span>
                </span>
                <span className="remocao-status remocao-status--danger">
                  <span className="remocao-status__dot" />
                  <span><Users size={14} /> Aguard. equipe: {summary.aguardando_motorista}</span>
                </span>
                <span className="remocao-status remocao-status--info">
                  <span className="remocao-status__dot" />
                  <span><Ambulance size={14} /> Em transporte: {summary.em_deslocamento}</span>
                </span>
                <span className="remocao-status remocao-status--critical">
                  <span className="remocao-status__dot" />
                  <span><AlertCircle size={14} /> Críticas: {summary.criticas}</span>
                </span>
                <span className="remocao-status remocao-status--success">
                  <span className="remocao-status__dot" />
                  <span><CheckCircle size={14} /> Concluídas: {summary.concluidas}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={clsx('remocao-toolbar', showFilters && 'show-filters')}>
          <div className="remocao-search">
            <Search className="remocao-search__icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por paciente, número, motorista..."
              value={filter.search}
              onChange={handleSearchChange}
              className="remocao-input"
            />
          </div>
          <div className="remocao-inline">
            {filter.status !== 'all' && (
              <button
                onClick={() => setFilter({ status: 'all' })}
                className="remocao-btn remocao-btn--ghost remocao-btn--sm"
              >
                Limpar status
              </button>
            )}
          </div>
        </div>

        <div className="remocao-inline">
          {Object.entries(STATUS_CONFIG)
            .filter(([_, config]) => config.critical || config.nextStates.length > 0)
            .slice(0, 8)
            .map(([status, config]) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status as StatusRemocao)}
                className={clsx(
                  'remocao-status',
                  filter.status === status && 'ring-2 ring-blue-500',
                  config.color === 'critical' && 'remocao-status--critical',
                  config.color === 'warning' && 'remocao-status--warning',
                  config.color === 'in-transit' && 'remocao-status--moving',
                  config.color === 'delivered' && 'remocao-status--delivered',
                  config.color === 'cancelled' && 'remocao-status--cancelled',
                  config.color === 'scheduled' && 'remocao-status--scheduled'
                )}
              >
                <span className="remocao-status__dot" />
                <span>{config.icon} {config.label}</span>
              </button>
            ))}
        </div>

        {loading ? (
          <div className="remocao-empty">
            <span className="remocao-spinner" />
            <p className="remocao-empty__text">Carregando remoções...</p>
          </div>
        ) : filteredRemocoes.length === 0 ? (
          <div className="remocao-empty">
            <span className="remocao-empty__icon"><Inbox size={24} /></span>
            <p className="remocao-empty__title">Nenhuma remoção encontrada</p>
          </div>
        ) : viewMode === 'table' ? (
          <FilaOperacional
            remocoes={filteredRemocoes}
            onRemocaoClick={(r) => setSelectedRemocao(r)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRemocoes.map((r) => (
              <RemocaoCard key={r.id} remocao={r} onClick={() => setSelectedRemocao(r)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
