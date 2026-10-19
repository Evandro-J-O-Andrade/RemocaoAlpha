-- =============================================================================
-- REMOÇÃO ALPHA — Tenants and Identity Foundation
-- =============================================================================
-- Purpose: Establish the core identity model with organizations (tenants),
-- people (identity), and the linkage between them.
-- Replaces: parts of 006_identity.sql with corrected architecture
-- =============================================================================

-- =============================================================================
-- Organizations (tenants) — multi-tenant root entity
-- =============================================================================
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text,
  email text,
  telefone text,
  endereco text,
  ativo boolean default true,
  config jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists idx_tenants_cnpj on tenants(cnpj) where cnpj is not null;
create index if not exists idx_tenants_ativo on tenants(ativo) where ativo;

-- =============================================================================
-- People — identity of a person (maps to auth.users.id)
-- =============================================================================
create table if not exists people (
  id uuid primary key, -- references auth.users.id (same UUID)
  nome text not null,
  email text,
  telefone text,
  data_nascimento date,
  cpf text,
  genero text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_people_email on people(email);
create unique index if not exists idx_people_cpf on people(cpf) where cpf is not null;

-- =============================================================================
-- Trigger: auto-create people row when auth.users row is created
-- =============================================================================
create or replace function public.handle_new_user_create_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into people (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_create_person on auth.users;
create trigger on_auth_user_create_person
  after insert on auth.users
  for each row
  execute function public.handle_new_user_create_person();

-- =============================================================================
-- Roles — system roles for authorization
-- =============================================================================
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,        -- e.g., 'admin', 'motorista', 'enfermeiro_chefe'
  nome text not null,
  descricao text,
  nivel integer default 0,         -- hierarchy level for UI display
  sistema boolean default false,   -- system roles cannot be deleted
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================================================
-- Permissions — catalog of all permissions in the system
-- =============================================================================
create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,        -- e.g., 'remocao.remocao.read'
  nome text not null,
  descricao text,
  categoria text not null,         -- e.g., 'remocao', 'equipe', 'veiculo'
  created_at timestamp with time zone default now()
);

create index if not exists idx_permissions_categoria on permissions(categoria);

-- =============================================================================
-- Role Permissions — many-to-many between roles and permissions
-- =============================================================================
create table if not exists role_permissions (
  role_id uuid references roles(id) on delete cascade not null,
  permission_id uuid references permissions(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (role_id, permission_id)
);

-- =============================================================================
-- Enable RLS on identity tables
-- =============================================================================
alter table tenants enable row level security;
alter table people enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;

-- =============================================================================
-- RLS Policies — Identity tables
-- =============================================================================

-- Tenants: authenticated users can read active tenants
create policy "tenants_select_active" on tenants for select
  using (ativo = true);

-- People: users can read/update their own profile
create policy "people_select_own" on people for select
  using (id = auth.uid());
create policy "people_update_own" on people for update
  using (id = auth.uid());

-- Roles: authenticated users can read all roles
create policy "roles_select_all" on roles for select
  using (true);

-- Permissions: authenticated users can read all permissions
create policy "permissions_select_all" on permissions for select
  using (true);

-- Role permissions: authenticated users can read all
create policy "role_permissions_select_all" on role_permissions for select
  using (true);

-- =============================================================================
-- Seed: Default roles
-- =============================================================================
insert into roles (key, nome, descricao, nivel, sistema) values
  ('admin', 'Administrador', 'Acesso total ao sistema', 100, true),
  ('gestor', 'Gestor', 'Gestão operacional e relatórios', 80, true),
  ('enfermeiro_chefe', 'Enfermeiro Chefe', 'Avaliação clínica e autorização', 60, true),
  ('enfermeiro', 'Enfermeiro', 'Avaliação clínica e checklist', 50, true),
  ('medico', 'Médico', 'Avaliação médica e autorização', 55, true),
  ('motorista', 'Motorista', 'Operação de veículos e check-in/out', 40, true),
  ('atendente', 'Atendente', 'Solicitação e acompanhamento básico', 30, true)
on conflict (key) do nothing;

-- =============================================================================
-- Seed: Permissions catalog
-- =============================================================================
insert into permissions (key, nome, descricao, categoria) values
  -- Remocao
  ('remocao.remocao.read', 'Visualizar remoções', 'Permite visualizar a lista de remoções', 'remocao'),
  ('remocao.remocao.create', 'Solicitar remoção', 'Permite criar nova solicitação de remoção', 'remocao'),
  ('remocao.remocao.evaluate', 'Avaliar remoção', 'Permite registrar avaliação clínica pré-transporte', 'remocao'),
  ('remocao.remocao.authorize', 'Autorizar remoção', 'Permite autorizar a saída do paciente', 'remocao'),
  ('remocao.remocao.update_status', 'Atualizar status', 'Permite atualizar o status da remoção', 'remocao'),
  ('remocao.remocao.cancel', 'Cancelar remoção', 'Permite cancelar uma remoção', 'remocao'),
  ('remocao.remocao.update', 'Editar remoção', 'Permite editar dados da remoção', 'remocao'),
  -- Equipe
  ('remocao.equipe.compose', 'Montar equipe', 'Permite montar a equipe da remoção', 'equipe'),
  ('remocao.equipe.add_member', 'Adicionar membro', 'Adiciona profissional à equipe', 'equipe'),
  ('remocao.equipe.remove_member', 'Remover membro', 'Remove profissional da equipe', 'equipe'),
  -- Motorista
  ('remocao.motorista.confirm', 'Confirmar motorista', 'Confirma motorista na remoção', 'motorista'),
  ('remocao.motorista.checkin', 'Check-in motorista', 'Registra check-in do motorista', 'motorista'),
  ('remocao.motorista.checkout', 'Check-out motorista', 'Registra check-out do motorista', 'motorista'),
  -- Veiculo
  ('remocao.veiculo.scalate', 'Escalar veículo', 'Escala veículo para a remoção', 'veiculo'),
  ('remocao.veiculo.update', 'Atualizar veículo', 'Atualiza dados do veículo', 'veiculo'),
  -- Destino
  ('remocao.destino.confirm', 'Confirmar destino', 'Confirma recebimento no destino', 'destino'),
  -- Documentos
  ('remocao.documento.upload', 'Upload documento', 'Envia documentos para a remoção', 'documento'),
  ('remocao.documento.conferir', 'Conferir documento', 'Confere extração de documento', 'documento'),
  -- Checklist
  ('remocao.checklist.complete', 'Concluir checklist', 'Marca checklist como concluído', 'checklist'),
  -- Intercorrencias
  ('remocao.intercorrencia.create', 'Registrar intercorrência', 'Registra intercorrência durante transporte', 'intercorrencia'),
  ('remocao.intercorrencia.read', 'Visualizar intercorrências', 'Visualiza intercorrências', 'intercorrencia'),
  -- Auditoria
  ('remocao.auditoria.read', 'Consultar auditoria', 'Acessa trilha de auditoria', 'auditoria'),
  -- Dashboard
  ('remocao.dashboard.read', 'Dashboard remoções', 'Visualiza dashboard de remoções', 'dashboard'),
  ('remocao.dashboard.operacional', 'Painel operacional', 'Acessa painel operacional em tempo real', 'dashboard'),
  -- Admin
  ('admin.tenant.manage', 'Gerenciar organização', 'Gerencia configurações da organização', 'admin'),
  ('admin.users.manage', 'Gerenciar usuários', 'Gerencia usuários e permissões', 'admin'),
  ('admin.roles.manage', 'Gerenciar funções', 'Gerencia funções e permissões', 'admin')
on conflict (key) do nothing;

-- =============================================================================
-- Seed: Role-Permission mappings
-- =============================================================================
-- Admin: all permissions
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'admin'
on conflict do nothing;

-- Gestor: operational permissions + dashboard
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'gestor'
  and p.key in (
    'remocao.remocao.read', 'remocao.remocao.create', 'remocao.remocao.evaluate',
    'remocao.remocao.authorize', 'remocao.remocao.update_status', 'remocao.remocao.cancel',
    'remocao.remocao.update', 'remocao.equipe.compose', 'remocao.equipe.add_member',
    'remocao.equipe.remove_member', 'remocao.motorista.confirm', 'remocao.motorista.checkin',
    'remocao.motorista.checkout', 'remocao.veiculo.scalate', 'remocao.veiculo.update',
    'remocao.destino.confirm', 'remocao.documento.upload', 'remocao.documento.conferir',
    'remocao.checklist.complete', 'remocao.intercorrencia.create', 'remocao.intercorrencia.read',
    'remocao.auditoria.read', 'remocao.dashboard.read', 'remocao.dashboard.operacional'
  )
on conflict do nothing;

-- Enfermeiro Chefe: clinical + team + dashboard
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'enfermeiro_chefe'
  and p.key in (
    'remocao.remocao.read', 'remocao.remocao.create', 'remocao.remocao.evaluate',
    'remocao.remocao.authorize', 'remocao.remocao.update_status', 'remocao.remocao.cancel',
    'remocao.remocao.update', 'remocao.equipe.compose', 'remocao.equipe.add_member',
    'remocao.equipe.remove_member', 'remocao.destino.confirm', 'remocao.documento.upload',
    'remocao.documento.conferir', 'remocao.checklist.complete', 'remocao.intercorrencia.create',
    'remocao.intercorrencia.read', 'remocao.auditoria.read', 'remocao.dashboard.read',
    'remocao.dashboard.operacional'
  )
on conflict do nothing;

-- Enfermeiro: clinical + checklist + basic
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'enfermeiro'
  and p.key in (
    'remocao.remocao.read', 'remocao.remocao.evaluate', 'remocao.equipe.add_member',
    'remocao.checklist.complete', 'remocao.intercorrencia.create', 'remocao.documento.upload',
    'remocao.dashboard.read'
  )
on conflict do nothing;

-- Medico: clinical + authorization
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'medico'
  and p.key in (
    'remocao.remocao.read', 'remocao.remocao.evaluate', 'remocao.remocao.authorize',
    'remocao.intercorrencia.read', 'remocao.auditoria.read', 'remocao.dashboard.read'
  )
on conflict do nothing;

-- Motorista: vehicle operations + basic
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'motorista'
  and p.key in (
    'remocao.remocao.read', 'remocao.motorista.confirm', 'remocao.motorista.checkin',
    'remocao.motorista.checkout', 'remocao.intercorrencia.create', 'remocao.dashboard.read'
  )
on conflict do nothing;

-- Atendente: basic operations
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.key = 'atendente'
  and p.key in (
    'remocao.remocao.read', 'remocao.remocao.create', 'remocao.dashboard.read'
  )
on conflict do nothing;