-- =============================================================================
-- REMOÇÃO ALPHA — Core Enums & Lookup Tables (Preserved from 000)
-- =============================================================================
-- Purpose: Define all enum types and core lookup tables for the remocao domain
-- =============================================================================

-- Tipo de transporte (classification.clinical_type)
create type remocao_tipo_transporte as enum (
  'simple',       -- Remoção simples/eletiva
  'basico',       -- Suporte básico
  'intermediario',-- Suporte intermediário
  'avancado',     -- Suporte avançado
  'urgente'       -- Emergencial/urgente
);

-- Nível de suporte (aligns with COFEN 713/2022)
create type remocao_nivel_suporte as enum (
  'basico',
  'intermediario',
  'avancado'
);

-- Finalidade da remoção (classification.purpose)
create type remocao_finalidade as enum (
  'exame',
  'procedimento',
  'consulta',
  'transferencia_inter_hospitalar',
  'transferencia_intra_rede',
  'alta_hospitalar',
  'retorno_residencia',
  'retorno_unidade_origem',
  'outro'
);

-- Status da máquina de estados (section 13)
create type remocao_status as enum (
  'SOLICITADA',
  'EM_AVALIACAO',
  'AGUARDANDO_DESTINO',
  'DESTINO_CONFIRMADO',
  'AGUARDANDO_EQUIPE',
  'EQUIPE_CONFIRMADA',
  'AGUARDANDO_MOTORISTA',
  'MOTORISTA_CHECKIN',
  'MOTORISTA_CONFIRMADO',
  'CHECKLIST_PENDENTE',
  'PRONTA_PARA_SAIDA',
  'EM_DESLOCAMENTO',
  'CHEGADA_DESTINO',
  'PACIENTE_ENTREGUE',
  'RETORNANDO',
  'RETORNOU_UNIDADE',
  'ENCERRADA',
  'CANCELADA',
  'SUSPENSA',
  'INTERCORRENCIA',
  'NAO_REALIZADA'
);

-- Prioridade da remoção
create type remocao_prioridade as enum (
  'rotina',
  'urgente',
  'emergencial'
);

-- Necessidade de médico
create type remocao_necessidade_medica as enum (
  'obrigatorio',
  'solicitado',
  'dispensado',
  'nao_disponivel',
  'nao_necessario'
);

-- Condição clínica do paciente (section 5)
create type remocao_condicao_clinica as enum (
  'estavel',
  'instavel',
  'grave',
  'critico',
  'emergencia'
);

-- Tipo de intercorrência (section 17)
create type remocao_tipo_intercorrencia as enum (
  'alteracao_sinais_vitais',
  'queda',
  'deterioracao_clinica',
  'parada_cardiorrespiratoria',
  'falta_equipamento',
  'falha_equipamento',
  'falta_oxigenio',
  'acidente',
  'atraso',
  'problema_destino',
  'recusa_destino',
  'retorno_origem',
  'outro'
);

-- Role do membro de equipe (section 2)
create type remocao_equipe_role as enum (
  'motorista',
  'tecnico_enfermagem',
  'enfermeiro',
  'medico',
  'outro'
);

-- Tipo de veículo
create type remocao_tipo_veiculo as enum (
  'ambulancia_a',
  'ambulancia_b',
  'ambulancia_c',
  'ambulancia_d',
  'veiculo_especial',
  'outro'
);

-- Situação do veículo
create type remocao_situacao_veiculo as enum (
  'disponivel',
  'ocupado',
  'em_manutencao',
  'indisponivel'
);

-- Status de documento (section 27 docs)
create type remocao_documento_status as enum (
  'UPLOADED',
  'PROCESSING',
  'EXTRACTED',
  'PENDING_REVIEW',
  'REVIEWING',
  'APPROVED',
  'IMPORTED',
  'REJECTED',
  'FAILED'
);

-- Tipo de documento
create type remocao_documento_tipo as enum (
  'relatorio_medico',
  'documento_transferencia',
  'autorizacao_transferencia',
  'pedido_exame',
  'resultado_exame',
  'prescricao',
  'documento_administrativo',
  'outro'
);

-- Disponibilidade do motorista
create type remocao_motorista_status as enum (
  'disponivel',
  'ocupado',
  'em_deslocamento',
  'em_retorno',
  'indisponivel'
);

-- Checklist seção
create type remocao_checklist_secao as enum (
  'identificacao',
  'condicao_clinica',
  'documentacao',
  'veiculo',
  'equipe'
);

-- =============================================================================
-- Core lookup tables
-- =============================================================================

-- Table: remocao_tabela_referencia (lookup values for configurable items)
create table if not exists remocao_tabela_referencia (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  codigo text not null,
  nome text not null,
  descricao text,
  tipo text not null, -- 'condicao_clinica', 'precaucao', 'necessidade', etc.
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, codigo, tipo)
);

-- Table: remocao_unidade (hospital unit / service)
create table if not exists remocao_unidade (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  codigo text not null,
  nome text not null,
  tipo text, -- 'hospital', 'clinica', 'centro_diagnostico', 'residencia'
  endereco text,
  telefone text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, codigo)
);

-- Table: remocao_setor (sector within a unit: enfermaria, UTIC, etc.)
create table if not exists remocao_setor (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  unidade_id uuid references remocao_unidade(id) not null,
  codigo text not null,
  nome text not null,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, unidade_id, codigo)
);

-- =============================================================================
-- Enable RLS on lookup tables
-- =============================================================================
alter table remocao_tabela_referencia enable row level security;
alter table remocao_unidade enable row level security;
alter table remocao_setor enable row level security;

-- =============================================================================
-- RLS Policies — Lookup tables
--    IMPORTANT: Use DROP POLICY IF EXISTS for idempotency.
--    These tables may already exist from migration 20261008000000.
-- =============================================================================

-- remocao_tabela_referencia
drop policy if exists "remocao_tabela_referencia_select" on remocao_tabela_referencia;
drop policy if exists "remocao_tabela_referencia_insert" on remocao_tabela_referencia;
drop policy if exists "remocao_tabela_referencia_update" on remocao_tabela_referencia;
create policy "remocao_tabela_referencia_select" on remocao_tabela_referencia for select
  using (tenant_id = get_active_tenant_id());
create policy "remocao_tabela_referencia_insert" on remocao_tabela_referencia for insert
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));
create policy "remocao_tabela_referencia_update" on remocao_tabela_referencia for update
  using (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'))
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));

-- remocao_unidade
drop policy if exists "remocao_unidade_select" on remocao_unidade;
drop policy if exists "remocao_unidade_insert" on remocao_unidade;
drop policy if exists "remocao_unidade_update" on remocao_unidade;
create policy "remocao_unidade_select" on remocao_unidade for select
  using (tenant_id = get_active_tenant_id() and ativo = true);
create policy "remocao_unidade_insert" on remocao_unidade for insert
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));
create policy "remocao_unidade_update" on remocao_unidade for update
  using (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'))
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));

-- remocao_setor
drop policy if exists "remocao_setor_select" on remocao_setor;
drop policy if exists "remocao_setor_insert" on remocao_setor;
drop policy if exists "remocao_setor_update" on remocao_setor;
create policy "remocao_setor_select" on remocao_setor for select
  using (tenant_id = get_active_tenant_id() and ativo = true);
create policy "remocao_setor_insert" on remocao_setor for insert
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));
create policy "remocao_setor_update" on remocao_setor for update
  using (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'))
  with check (tenant_id = get_active_tenant_id() and has_permission('admin.tenant.manage'));

-- =============================================================================
-- Trigger: updated_at for lookup tables
-- =============================================================================
create or replace function update_lookup_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_remocao_tabela_referencia_updated_at on remocao_tabela_referencia;
create trigger trigger_remocao_tabela_referencia_updated_at
  before update on remocao_tabela_referencia
  for each row
  execute function update_lookup_updated_at();

drop trigger if exists trigger_remocao_unidade_updated_at on remocao_unidade;
create trigger trigger_remocao_unidade_updated_at
  before update on remocao_unidade
  for each row
  execute function update_lookup_updated_at();

drop trigger if exists trigger_remocao_setor_updated_at on remocao_setor;
create trigger trigger_remocao_setor_updated_at
  before update on remocao_setor
  for each row
  execute function update_lookup_updated_at();