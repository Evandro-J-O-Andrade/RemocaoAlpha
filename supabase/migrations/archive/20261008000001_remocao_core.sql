-- =============================================================================
-- REMOÇÃO MODULE — Core Entities
-- =============================================================================

-- Main remessa/remoca head table
create table if not exists remocao (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
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
  created_by uuid references auth.users,
  updated_by uuid references auth.users
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
-- Team composition (section 2)
-- =============================================================================
create table if not exists remocao_equipe (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  tenant_id uuid references auth.users not null,
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
-- Vehicle (section 25)
-- =============================================================================
create table if not exists remocao_veiculo (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
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
-- Driver (section 24)
-- =============================================================================
create table if not exists remocao_motorista (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
  pessoa_id uuid, -- references people table if exists
  nome text not null,
  cpf text,
  cnh text,
  telefone text,
  email text,
  status remocao_motorista_status default 'disponivel',
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
  tenant_id uuid references auth.users not null,
  data date not null,
  hora_inicio time not null,
  hora_fim time,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  unique (motorista_id, data)
);
