-- =============================================================================
-- REMOÇÃO MODULE — Process entities
-- =============================================================================

-- =============================================================================
-- Clinical evaluation (section 5)
-- =============================================================================
create table if not exists remocao_avaliacao_clinica (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  enfermeiro_id uuid,
  enfermeiro_nome text,
  medico_id uuid,
  medico_nome text,
  estado_clinico remocao_condicao_clinica,
  sinais_vitais jsonb, -- { pressao, frequencia_cardiaca, saturacao, temperatura, ... }
  nivel_consciencia text,
  oxigenoterapia boolean,
  concentracao_oxigenio numeric,
  acesso_venoso boolean,
  tipo_acesso text,
  infusao boolean,
  medicamento_infusao text,
  ventilacao boolean,
  tipo_ventilacao text,
  mobilidade text,
  risco_queda boolean,
  necessidade_monitorizacao boolean,
  necessidade_oxigenio boolean,
  necessidade_medicamento_transporte boolean,
  risco_deterioracao boolean,
  necessidade_medica boolean,
  avaliacao_medica text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================================================
-- Checklist pré-saída (section 8)
-- =============================================================================
create type remocao_checklist_secao as enum (
  'identificacao',
  'condicao_clinica',
  'documentacao',
  'veiculo',
  'equipe'
);

create table if not exists remocao_checklist (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  secao remocao_checklist_secao not null,
  item_key text not null,
  item_label text not null,
  checked boolean default false,
  checked_by uuid,
  checked_at timestamp with time zone,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (remocao_id, secao, item_key)
);

-- =============================================================================
-- Destination confirmation (section 6)
-- =============================================================================
create table if not exists remocao_destino_confirmacao (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  unidade_id uuid references remocao_unidade,
  setor_id uuid references remocao_setor,
  profissional_id uuid,
  profissional_nome text not null,
  cargo text,
  telefone text,
  email text,
  data_confirmacao timestamp with time zone default now(),
  observacoes text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- Driver check-in / check-out (sections 9, 10, 16)
-- =============================================================================
create table if not exists remocao_checkin (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  motorista_id uuid references remocao_motorista,
  veiculo_id uuid references remocao_veiculo,
  quilometragem_inicial integer,
  observacoes text,
  created_at timestamp with time zone default now(),
  created_by uuid
);

create table if not exists remocao_checkout (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  motorista_id uuid references remocao_motorista,
  veiculo_id uuid references remocao_veiculo,
  quilometragem_final integer,
  retorno_com_paciente boolean,
  retorno_com_equipe boolean,
  intercorrencias text,
  problemas_veiculo text,
  observacoes text,
  tempo_total interval,
  quilometragem_percorrida integer,
  created_at timestamp with time zone default now(),
  created_by uuid
);

-- =============================================================================
-- Intercurrences (section 17)
-- =============================================================================
create table if not exists remocao_intercorrencia (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  tipo remocao_tipo_intercorrencia not null,
  data_hora timestamp with time zone default now(),
  profissional_id uuid,
  profissional_nome text,
  evento text,
  conduta text,
  resultado text,
  necessidade_acicionamento_medico boolean,
  necessidade_mudanca_destino boolean,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================================================
-- Status history / event log (section 27 - evento)
-- =============================================================================
create table if not exists remocao_status_historico (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  status_anterior remocao_status,
  status_novo remocao_status not null,
  motivo text,
  criado_por uuid references auth.users,
  criado_por_nome text,
  created_at timestamp with time zone default now()
);

create table if not exists remocao_evento (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  evento text not null, -- 'checkin_motorista', 'checkout', 'chegada', 'entrega', etc.
  descricao text,
  nivel text, -- 'info', 'warning', 'critical'
  dados jsonb, -- arbitrary event payload
  criado_por uuid references auth.users,
  criado_por_nome text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- Documents (section 27 / document lifecycle)
-- =============================================================================
create table if not exists remocao_documento (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  tenant_id uuid references auth.users not null,
  tipo remocao_documento_tipo,
  titulo text not null,
  descricao text,
  storage_path text not null, -- path in Supabase Storage
  storage_bucket text not null,
  file_hash text,
  file_size integer,
  mime_type text,
  status remocao_documento_status default 'UPLOADED',
  enviado_por uuid references auth.users,
  enviado_por_nome text,
  enviado_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================================================
-- Document extraction (OCR draft)
-- =============================================================================
create table if not exists remocao_documento_extracao (
  id uuid default gen_random_uuid() primary key,
  documento_id uuid references remocao_documento on delete cascade not null,
  dados_estruturados jsonb,
  dados_estruturados_brutos jsonb,
  confianca numeric(5,4),
  processador text, -- 'azure_form', 'google_vision', etc.
  texto_extraido text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- Document review/conference
-- =============================================================================
create table if not exists remocao_documento_conferencia (
  id uuid default gen_random_uuid() primary key,
  documento_id uuid references remocao_documento on delete cascade not null,
  conferido_por uuid references auth.users,
  conferido_por_nome text,
  conferido_at timestamp with time zone default now(),
  alteracoes jsonb, -- list of field corrections
  campos_aceitos jsonb, -- fields confirmed
  resultado remocao_documento_status,
  observacoes text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- GPS / route (sections on tracking)
-- =============================================================================
create table if not exists remocao_rota (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  origem_lat numeric(10,8),
  origem_lng numeric(11,8),
  destino_lat numeric(10,8),
  destino_lng numeric(11,8),
  origem_endereco text,
  destino_endereco text,
  distancia_prevista_km numeric(6,2),
  duracao_prevista_minutos integer,
  status_rota text, -- 'planejada', 'ativa', 'concluida'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists remocao_gps_posicao (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  motorista_id uuid references remocao_motorista,
  veiculo_id uuid references remocao_veiculo,
  latitude numeric(10,8) not null,
  longitude numeric(11,8) not null,
  accuracy numeric(8,2),
  heading numeric(6,2),
  speed numeric(6,2),
  altitude numeric(8,2),
  recorded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create index idx_remocao_gps_remocao_recorded on remocao_gps_posicao(remocao_id, recorded_at desc);
create index idx_remocao_gps_veiculo_recorded on remocao_gps_posicao(veiculo_id, recorded_at desc);

-- =============================================================================
-- Audit trail (section 21) — immutable
-- =============================================================================
create table if not exists remocao_auditoria (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references auth.users not null,
  remocao_id uuid references remocao on delete cascade,
  acao text not null, -- 'create', 'update_status', 'add_team_member', 'checkout', etc.
  entidade text not null, -- 'remocao', 'equipe', 'veiculo', 'documento', 'checklist'
  registro_id uuid,
  detalhes jsonb,
  usuario_id uuid references auth.users,
  usuario_nome text,
  usuario_role text,
  ip_origem text,
  user_agent text,
  created_at timestamp with time zone default now()
);

create index idx_remocao_auditoria_tenant on remocao_auditoria(tenant_id, created_at desc);
create index idx_remocao_auditoria_remocao on remocao_auditoria(remocao_id, created_at desc);
