-- =============================================================================
-- REMOÇÃO ALPHA — Process Tables (Corrected from 002)
-- =============================================================================
-- Purpose: Clinical evaluation, checklist, destination confirmation,
-- driver check-in/out, intercorrencias, status history, events,
-- documents, GPS, routes, and audit trail
-- =============================================================================

-- =============================================================================
-- Clinical evaluation
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
-- Checklist pré-saída
-- =============================================================================
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
-- Destination confirmation
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
-- Driver check-in / check-out
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
-- Intercurrences
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
-- Status history / event log (immutable)
-- =============================================================================
create table if not exists remocao_status_historico (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  status_anterior remocao_status,
  status_novo remocao_status not null,
  motivo text,
  criado_por uuid references people,
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
  criado_por uuid references people,
  criado_por_nome text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- Documents
-- =============================================================================
create table if not exists remocao_documento (
  id uuid default gen_random_uuid() primary key,
  remocao_id uuid references remocao on delete cascade not null,
  tenant_id uuid references tenants(id) not null,
  tipo remocao_documento_tipo,
  titulo text not null,
  descricao text,
  storage_path text not null, -- path in Supabase Storage
  storage_bucket text not null,
  file_hash text,
  file_size integer,
  mime_type text,
  status remocao_documento_status default 'UPLOADED',
  enviado_por uuid references people,
  enviado_por_nome text,
  enviado_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Document extraction (OCR)
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

-- Document review/conference
create table if not exists remocao_documento_conferencia (
  id uuid default gen_random_uuid() primary key,
  documento_id uuid references remocao_documento on delete cascade not null,
  conferido_por uuid references people,
  conferido_por_nome text,
  conferido_at timestamp with time zone default now(),
  alteracoes jsonb, -- list of field corrections
  campos_aceitos jsonb, -- fields confirmed
  resultado remocao_documento_status,
  observacoes text,
  created_at timestamp with time zone default now()
);

-- =============================================================================
-- GPS / route
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

create index if not exists idx_remocao_gps_remocao_recorded on remocao_gps_posicao(remocao_id, recorded_at desc);
create index if not exists idx_remocao_gps_veiculo_recorded on remocao_gps_posicao(veiculo_id, recorded_at desc);

-- =============================================================================
-- Audit trail (immutable)
-- =============================================================================
create table if not exists remocao_auditoria (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id),
  remocao_id uuid references remocao on delete cascade,
  acao text not null, -- 'create', 'update_status', 'add_team_member', 'checkout', etc.
  entidade text not null, -- 'remocao', 'equipe', 'veiculo', 'documento', 'checklist'
  registro_id uuid,
  detalhes jsonb,
  usuario_id uuid references people,
  usuario_nome text,
  usuario_role text,
  ip_origem text,
  user_agent text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_remocao_auditoria_tenant on remocao_auditoria(tenant_id, created_at desc);
create index if not exists idx_remocao_auditoria_remocao on remocao_auditoria(remocao_id, created_at desc);
create index if not exists idx_remocao_auditoria_root on remocao_auditoria(tenant_id) where tenant_id is null;

-- =============================================================================
-- Enable RLS on process tables
-- =============================================================================
alter table remocao_avaliacao_clinica enable row level security;
alter table remocao_checklist enable row level security;
alter table remocao_destino_confirmacao enable row level security;
alter table remocao_checkin enable row level security;
alter table remocao_checkout enable row level security;
alter table remocao_intercorrencia enable row level security;
alter table remocao_status_historico enable row level security;
alter table remocao_evento enable row level security;
alter table remocao_documento enable row level security;
alter table remocao_documento_extracao enable row level security;
alter table remocao_documento_conferencia enable row level security;
alter table remocao_rota enable row level security;
alter table remocao_gps_posicao enable row level security;
alter table remocao_auditoria enable row level security;

-- =============================================================================
-- RLS Policies — Process tables
-- =============================================================================

-- remocao_avaliacao_clinica
create policy "remocao_avaliacao_select" on remocao_avaliacao_clinica for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_avaliacao_insert" on remocao_avaliacao_clinica for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.remocao.evaluate'));
create policy "remocao_avaliacao_update" on remocao_avaliacao_clinica for update using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.remocao.evaluate'));

-- remocao_checklist
create policy "remocao_checklist_select" on remocao_checklist for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_checklist_insert" on remocao_checklist for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_checklist_update" on remocao_checklist for update using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.checklist.complete'));

-- remocao_destino_confirmacao
create policy "remocao_destino_confirmacao_select" on remocao_destino_confirmacao for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_destino_confirmacao_insert" on remocao_destino_confirmacao for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.destino.confirm'));

-- remocao_checkin
create policy "remocao_checkin_select" on remocao_checkin for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_checkin_insert" on remocao_checkin for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.motorista.checkin'));

-- remocao_checkout
create policy "remocao_checkout_select" on remocao_checkout for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_checkout_insert" on remocao_checkout for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.motorista.checkout'));

-- remocao_intercorrencia
create policy "remocao_intercorrencia_select" on remocao_intercorrencia for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_intercorrencia_insert" on remocao_intercorrencia for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.intercorrencia.create'));
create policy "remocao_intercorrencia_update" on remocao_intercorrencia for update using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()) and has_permission('remocao.intercorrencia.create'));

-- remocao_status_historico (read-only after creation)
create policy "remocao_status_historico_select" on remocao_status_historico for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));

-- remocao_evento (read-only after creation)
create policy "remocao_evento_select" on remocao_evento for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));

-- remocao_documento
create policy "remocao_documento_select" on remocao_documento for select using (tenant_id = get_active_tenant_id() and has_permission('remocao.documento.read'));
create policy "remocao_documento_insert" on remocao_documento for insert with check (tenant_id = get_active_tenant_id() and has_permission('remocao.documento.upload'));
create policy "remocao_documento_update" on remocao_documento for update using (tenant_id = get_active_tenant_id() and has_permission('remocao.documento.conferir'));
create policy "remocao_documento_delete" on remocao_documento for delete using (tenant_id = get_active_tenant_id() and has_permission('remocao.documento.upload'));

-- remocao_documento_extracao
create policy "remocao_doc_extracao_select" on remocao_documento_extracao for select using (documento_id in (select id from remocao_documento where tenant_id = get_active_tenant_id()));

-- remocao_documento_conferencia
create policy "remocao_doc_conferencia_select" on remocao_documento_conferencia for select using (documento_id in (select id from remocao_documento where tenant_id = get_active_tenant_id()));
create policy "remocao_doc_conferencia_insert" on remocao_documento_conferencia for insert with check (documento_id in (select id from remocao_documento where tenant_id = get_active_tenant_id()) and has_permission('remocao.documento.conferir'));
create policy "remocao_doc_conferencia_update" on remocao_documento_conferencia for update using (documento_id in (select id from remocao_documento where tenant_id = get_active_tenant_id()) and has_permission('remocao.documento.conferir'));

-- remocao_rota
create policy "remocao_rota_select" on remocao_rota for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_rota_insert" on remocao_rota for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));

-- remocao_gps_posicao
create policy "remocao_gps_select" on remocao_gps_posicao for select using (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));
create policy "remocao_gps_insert" on remocao_gps_posicao for insert with check (remocao_id in (select id from remocao where tenant_id = get_active_tenant_id()));

-- remocao_auditoria (read-only)
create policy "remocao_auditoria_select" on remocao_auditoria for select using (tenant_id = get_active_tenant_id() and has_permission('remocao.auditoria.read'));

-- =============================================================================
-- Indexes for process tables
-- =============================================================================
create index if not exists idx_remocao_avaliacao_remocao on remocao_avaliacao_clinica(remocao_id);
create index if not exists idx_remocao_checklist_remocao on remocao_checklist(remocao_id);
create index if not exists idx_remocao_destino_confirmacao_remocao on remocao_destino_confirmacao(remocao_id);
create index if not exists idx_remocao_checkin_remocao on remocao_checkin(remocao_id);
create index if not exists idx_remocao_checkout_remocao on remocao_checkout(remocao_id);
create index if not exists idx_remocao_intercorrencia_remocao on remocao_intercorrencia(remocao_id);
create index if not exists idx_remocao_status_historico_remocao on remocao_status_historico(remocao_id, created_at desc);
create index if not exists idx_remocao_evento_remocao on remocao_evento(remocao_id, created_at desc);
create index if not exists idx_remocao_documento_tenant_status on remocao_documento(tenant_id, status);
create index if not exists idx_remocao_documento_remocao on remocao_documento(remocao_id);
create index if not exists idx_remocao_rota_remocao on remocao_rota(remocao_id);

-- =============================================================================
-- Trigger: updated_at for process tables
-- =============================================================================
drop trigger if exists trigger_remocao_avaliacao_updated_at on remocao_avaliacao_clinica;
create trigger trigger_remocao_avaliacao_updated_at
  before update on remocao_avaliacao_clinica
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_checklist_updated_at on remocao_checklist;
create trigger trigger_remocao_checklist_updated_at
  before update on remocao_checklist
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_documento_updated_at on remocao_documento;
create trigger trigger_remocao_documento_updated_at
  before update on remocao_documento
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_intercorrencia_updated_at on remocao_intercorrencia;
create trigger trigger_remocao_intercorrencia_updated_at
  before update on remocao_intercorrencia
  for each row
  execute function update_remocao_core_updated_at();

drop trigger if exists trigger_remocao_rota_updated_at on remocao_rota;
create trigger trigger_remocao_rota_updated_at
  before update on remocao_rota
  for each row
  execute function update_remocao_core_updated_at();

-- =============================================================================
-- Trigger: validate driver approval before checkin
-- =============================================================================
create or replace function validate_driver_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aprovado boolean;
begin
  -- Check if motorista is approved
  select aprovado into v_aprovado
  from remocao_motorista
  where id = new.motorista_id;
  
  if not found then
    raise exception 'Motorista not found: %', new.motorista_id;
  end if;
  
  if not v_aprovado then
    raise exception 'Motorista não aprovado para operar';
  end if;
  
  return new;
end;
$$;

drop trigger if exists trigger_validate_driver_approval on remocao_checkin;
create trigger trigger_validate_driver_approval
  before insert on remocao_checkin
  for each row
  execute function validate_driver_approval();