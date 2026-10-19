-- =============================================================================
-- REMOÇÃO ALPHA — Core Entities (Corrected from 001)
-- =============================================================================
-- Purpose: Main remocao tables with correct FK references to tenants
-- Key fix: tenant_id references tenants(id) not auth.users
-- =============================================================================

-- =============================================================================
-- Main remessa/remocao head table
-- =============================================================================
create table if not exists remocao (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  numero text not null, -- sequential number e.g. 20240001
  titulo text,

  -- Patient linkage
  paciente_id bigint, -- references existing patient table if integrated
  paciente_nome text not null,
  paciente_prontuario text,
  paciente_data_nascimento date,
  paciente_sexo text,
  paciente_diagnostico text,
  paciente_condicao_clinica remocao_condicao_clinica,
  paciente_precaucoes text, -- JSON array of precaution names
  paciente_alergias text,    -- JSON array
  paciente_necessidades_especiais text,

  -- Origin
  origem_unidade_id uuid references remocao_unidade,
  origem_setor_id uuid references remocao_setor,
  origem_leito text,
  origem_responsavel_id uuid,  -- profissional solicitante

  -- Destination
  destino_unidade_id uuid references remocao_unidade,
  destino_setor_id uuid references remocao_setor,
  destino_endereco text,
  destino_contato_nome text,
  destino_contato_telefone text,
  destino_medico_receptor_id uuid,
  destino_confirmed_at timestamp with time zone,
  destino_confirmado_por uuid,

  -- Classification
  finalidade remocao_finalidade not null,
  tipo_transporte remocao_tipo_transporte,
  nivel_suporte remocao_nivel_suporte,
  prioridade remocao_prioridade default 'rotina',
  necessidade_medica remocao_necessidade_medica default 'nao_necessario',
  justificativa_medica text, -- when medico is obrigatorio or dispensado

  -- Scheduling
  data_prevista timestamp with time zone,
  horario_previsto_saida timestamp with time zone,
  horario_previsto_atendimento timestamp with time zone,

  -- Vehicle
  veiculo_id uuid references remocao_veiculo,
  quilometragem_inicial integer,
  quilometragem_final integer,

  -- Checkout (origin)
  checkout_at timestamp with time zone,
  checkout_por uuid,
  condicao_paciente_saida text,
  liberacao_por uuid,

  -- Checkin (destination)
  checkin_at timestamp with time zone,
  checkin_por uuid,

  -- Delivery
  entrega_por_id uuid, -- profissional receptor
  entrega_por_nome text,
  entrega_por_cargo text,
  entrega_at timestamp with time zone,
  condicao_paciente_entrega text,

  -- Driver checkout (return)
  checkout_motorista_at timestamp with time zone,
  checkout_motorista_por uuid,
  retorno_com_paciente boolean,
  retorno_com_equipe boolean,
  quilometragem_percorrida integer,
  tempo_total interval,

  -- Status & lifecycle
  status remocao_status default 'SOLICITADA',
  motivo_cancelamento text,
  motivo_suspensao text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references people,
  updated_by uuid references people
);

-- =============================================================================
-- Patient link (supports one-to-many: a remocao can involve multiple patients)
-- =============================================================================
create table if not exists remocao_paciente (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  paciente_id bigint,
  paciente_nome text not null,
  paciente_prontuario text,
  paciente_data_nascimento date,
  paciente_sexo text,
  paciente_diagnostico text,
  paciente_condicao_clinica remocao_condicao_clinica,
  paciente_precaucoes text,
  paciente_alergias text,
  paciente_necessidades_especiais text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================================================
-- Team composition
-- =============================================================================
create table if not exists remocao_equipe (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  tenant_id uuid references tenants(id) not null,
  nome text not null,
  nivel_suporte remocao_nivel_suporte not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists remocao_equipe_membro (
  id uuid default gen_random_uuid() primary key,
  equipe_id uuid references remocao_equipe on delete cascade not null,
  profissional_id uuid not null,
  profissional_nome text not null,
  profissional_cargo text,
  role remocao_equipe_role not null,
  confirmado boolean default false,
  confirmado_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- Vehicle
-- =============================================================================
create table if not exists remocao_veiculo (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  placa text not null,
  marca text,
  modelo text,
  tipo remocao_tipo_veiculo,
  classificacao text,
  situacao remocao_situacao_veiculo default 'disponivel',
  quilometragem integer default 0,
  equipamentos text, -- JSON array
  tem_oxigenio boolean default false,
  ultima_manutencao date,
  proxima_manutencao date,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, placa)
);

-- =============================================================================
-- Driver
-- =============================================================================
create table if not exists remocao_motorista (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) not null,
  pessoa_id uuid references people,
  nome text not null,
  cpf text,
  cnh text,
  cnh_categoria text,
  cnh_validade date,
  telefone text,
  email text,
  status remocao_motorista_status default 'disponivel',
  documentacao_completa boolean default false,
  aprovado boolean default false,
  aprovado_em timestamp with time zone,
  aprovado_por uuid references people,
  ultima_posicao_lat numeric(10,8),
  ultima_posicao_lng numeric(11,8),
  ultima_posicao_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, cpf)
);

create table if not exists remocao_motorista_turno (
  id uuid default gen_random_uuid() primary key,
  motorista_id uuid references remocao_motorista not null,
  tenant_id uuid references tenants(id) not null,
  data date not null,
  hora_inicio time not null,
  hora_fim time,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  unique (motorista_id, data)
);

-- =============================================================================
-- Indexes for core tables
-- =============================================================================
create index if not exists idx_remocao_tenant_status on remocao(tenant_id, status);
create index if not exists idx_remocao_tenant_created on remocao(tenant_id, created_at desc);
create index if not exists idx_remocao_tenant_numero on remocao(tenant_id, numero);
create index if not exists idx_remocao_paciente_remocao on remocao_paciente(remocao_id);
create index if not exists idx_remocao_equipe_remocao on remocao_equipe(remocao_id);
create index if not exists idx_remocao_equipe_membro_equipe on remocao_equipe_membro(equipe_id);
create index if not exists idx_remocao_veiculo_tenant_situacao on remocao_veiculo(tenant_id, situacao);
create index if not exists idx_remocao_motorista_tenant_status on remocao_motorista(tenant_id, status);
create index if not exists idx_remocao_motorista_pessoa on remocao_motorista(pessoa_id);
create index if not exists idx_remocao_motorista_aprovado on remocao_motorista(aprovado, status);

-- =============================================================================
-- Enable RLS on core tables
-- =============================================================================
alter table remocao enable row level security;
alter table remocao_paciente enable row level security;
alter table remocao_equipe enable row level security;
alter table remocao_equipe_membro enable row level security;
alter table remocao_veiculo enable row level security;
alter table remocao_motorista enable row level security;
alter table remocao_motorista_turno enable row level security;

-- =============================================================================
-- RLS Policies — Core tables (tenant isolation + RBAC)
-- =============================================================================

-- remocao
create policy "remocao_select" on remocao for select using (tenant_id = get_active_tenant_id());
create policy "remocao_insert" on remocao for insert with check (tenant_id = get_active_tenant_id() and has_permission('remocao.remocao.create'));
create policy "remocao_update" on remocao for update using (tenant_id = get_active_tenant_id() and has_permission('remocao.remocao.update'));
create policy "remocao_delete" on remocao for delete using (tenant_id = get_active_tenant_id() and has_permission('remocao.remocao.cancel'));

-- remocao_paciente
create policy "remocao_paciente_select" on remocao_paciente for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_paciente_insert" on remocao_paciente for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_paciente_update" on remocao_paciente for update using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_paciente_delete" on remocao_paciente for delete using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));

-- remocao_equipe
create policy "remocao_equipe_select" on remocao_equipe for select using (tenant_id = get_active_tenant_id());
create policy "remocao_equipe_insert" on remocao_equipe for insert with check (tenant_id = get_active_tenant_id() and has_permission('remocao.equipe.compose'));
create policy "remocao_equipe_update" on remocao_equipe for update using (tenant_id = get_active_tenant_id() and has_permission('remocao.equipe.compose'));
create policy "remocao_equipe_delete" on remocao_equipe for delete using (tenant_id = get_active_tenant_id() and has_permission('remocao.equipe.remove_member'));

-- remocao_equipe_membro
create policy "remocao_equipe_membro_select" on remocao_equipe_membro for select using (equipe_id in (select id from remocao_equipe where tenant_id = get_active_tenant_id()));
create policy "remocao_equipe_membro_insert" on remocao_equipe_membro for insert with check (equipe_id in (select id from remocao_equipe where tenant_id = get_active_tenant_id() and has_permission('remocao.equipe.add_member')));
create policy "remocao_equipe_membro_update" on remocao_equipe_membro for update using (equipe_id in (select id from remocao_equipe where tenant_id = get_active_tenant_id()));
create policy "remocao_equipe_membro_delete" on remocao_equipe_membro for delete using (equipe_id in (select id from remocao_equipe where tenant_id = get_active_tenant_id()));

-- remocao_veiculo
create policy "remocao_veiculo_select" on remocao_veiculo for select using (tenant_id = get_active_tenant_id());
create policy "remocao_veiculo_insert" on remocao_veiculo for insert with check (tenant_id = get_active_tenant_id() and has_permission('remocao.veiculo.update'));
create policy "remocao_veiculo_update" on remocao_veiculo for update using (tenant_id = get_active_tenant_id() and has_permission('remocao.veiculo.update'));
create policy "remocao_veiculo_delete" on remocao_veiculo for delete using (tenant_id = get_active_tenant_id() and has_permission('remocao.veiculo.update'));

-- remocao_motorista
create policy "remocao_motorista_select" on remocao_motorista for select using (tenant_id = get_active_tenant_id());
create policy "remocao_motorista_insert" on remocao_motorista for insert with check (tenant_id = get_active_tenant_id() and has_permission('remocao.motorista.confirm'));
create policy "remocao_motorista_update" on remocao_motorista for update using (tenant_id = get_active_tenant_id() and has_permission('remocao.motorista.confirm'));
create policy "remocao_motorista_delete" on remocao_motorista for delete using (tenant_id = get_active_tenant_id() and has_permission('remocao.motorista.confirm'));

-- remocao_motorista_turno
create policy "remocao_motorista_turno_select" on remocao_motorista_turno for select using (tenant_id = get_active_tenant_id());
create policy "remocao_motorista_turno_insert" on remocao_motorista_turno for insert with check (tenant_id = get_active_tenant_id());
create policy "remocao_motorista_turno_update" on remocao_motorista_turno for update using (tenant_id = get_active_tenant_id());
create policy "remocao_motorista_turno_delete" on remocao_motorista_turno for delete using (tenant_id = get_active_tenant_id());

-- =============================================================================
-- Trigger: updated_at for core tables
-- =============================================================================
create or replace function update_remocao_core_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_remocao_updated_at on remocao;
create trigger trigger_remocao_updated_at
  before update on remocao
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_equipe_updated_at on remocao_equipe;
create trigger trigger_remocao_equipe_updated_at
  before update on remocao_equipe
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_veiculo_updated_at on remocao_veiculo;
create trigger trigger_remocao_veiculo_updated_at
  before update on remocao_veiculo
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_motorista_updated_at on remocao_motorista;
create trigger trigger_remocao_motorista_updated_at
  before update on remocao_motorista
  for each row
  execute function update_remocao_core_updated_at();