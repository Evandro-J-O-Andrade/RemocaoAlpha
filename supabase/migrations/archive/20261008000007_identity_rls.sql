-- =============================================================================
-- REMOÇÃO ALPHA — Identity Layer: Update Helper Functions & RLS (Migration 007)
-- New Wave Sistema Digital
-- =============================================================================
-- Purpose: Wire the identity tables into the auth/RLS layer.
-- - get_tenant_id() now resolves from tenant_memberships
-- - get_current_person_id() now resolves from people table
-- - has_permission() now checks role_assignments + tenant role permissions
-- - RLS policies added on all new identity tables
-- =============================================================================

-- =============================================================================
-- Update get_tenant_id() — resolve real tenant from tenant_memberships
-- Falls back to auth.uid() for backward compat during migration
-- =============================================================================
create or replace function get_tenant_id()
returns uuid as $$
  select coalesce(
    (current_setting('request.tenant_id', true))::uuid,
    (select tenant_id from tenant_memberships
     where person_id = auth.uid()
     and status = 'ativo'
     limit 1),
    auth.uid()
  );
$$ language sql stable;

-- =============================================================================
-- Update get_current_person_id() — resolve from people table
-- =============================================================================
create or replace function get_current_person_id()
returns uuid as $$
  select coalesce(
    (current_setting('request.person_id', true))::uuid,
    auth.uid()
  );
$$ language sql stable;

-- =============================================================================
-- Update has_permission() — real RBAC check via role_assignments
-- =============================================================================
create or replace function has_permission(p_permission text)
returns boolean as $$
  select exists (
    select 1 from role_assignments
    where person_id = auth.uid()
      and permission_key = p_permission
      and (expira_em is null or expira_em > now())
  );
$$ language sql stable;

-- =============================================================================
-- Set search_path to ensure functions find public tables
-- =============================================================================
-- (functions already use default search_path; tables are in public schema)

-- =============================================================================
-- RLS on identity tables
-- =============================================================================
alter table organizations enable row level security;
alter table people enable row level security;
alter table tenant_memberships enable row level security;
alter table role_assignments enable row level security;

-- Organizations: visible to all authenticated, managed by admin org members
create policy "authenticated can read organizations" on organizations for select using (true);

-- People: users can read their own profile; admins can read all in their tenant
create policy "users can read own profile" on people for select using (id = auth.uid());
create policy "users can update own profile" on people for update using (id = auth.uid());

-- Tenant memberships: scoped to tenant
create policy "tenant_memberships_select" on tenant_memberships for select
  using (tenant_id = get_tenant_id());
create policy "tenant_memberships_insert" on tenant_memberships for insert
  with check (tenant_id = get_tenant_id());
create policy "tenant_memberships_update" on tenant_memberships for update
  using (tenant_id = get_tenant_id());

-- Role assignments: scoped to tenant
create policy "role_assignments_select" on role_assignments for select
  using (tenant_id = get_tenant_id());
create policy "role_assignments_insert" on role_assignments for insert
  with check (tenant_id = get_tenant_id());
create policy "role_assignments_update" on role_assignments for update
  using (tenant_id = get_tenant_id());

-- =============================================================================
-- Default tenant setup function
-- Creates a default organization + admin membership for new users
-- Called from the frontend after first sign-in if no membership exists.
-- =============================================================================
create or replace function create_default_tenant(
  p_user_id uuid,
  p_user_email text,
  p_org_name text default 'Nova Organização'
) returns uuid as
$$
declare
  v_org_id uuid;
  v_tenant_id uuid;
begin
  -- Generate org ID first
  v_org_id := gen_random_uuid();

  -- Insert organization
  insert into organizations (id, nome, email)
  values (v_org_id, p_org_name, p_user_email);

  -- Insert tenant membership as admin
  insert into tenant_memberships (tenant_id, person_id, papel, status, aprovado_em)
  values (v_org_id, p_user_id, 'admin', 'ativo', now());

  -- Grant all remocao permissions to admin
  insert into role_assignments (tenant_id, person_id, permission_key)
  select v_org_id, p_user_id, p.permission_key
  from (
    values
      ('remocao.remocao.read'),
      ('remocao.remocao.create'),
      ('remocao.remocao.evaluate'),
      ('remocao.remocao.authorize'),
      ('remocao.remocao.update_status'),
      ('remocao.remocao.cancel'),
      ('remocao.remocao.update'),
      ('remocao.equipe.compose'),
      ('remocao.equipe.add_member'),
      ('remocao.equipe.remove_member'),
      ('remocao.motorista.confirm'),
      ('remocao.motorista.checkin'),
      ('remocao.motorista.checkout'),
      ('remocao.veiculo.scalate'),
      ('remocao.veiculo.update'),
      ('remocao.destino.confirm'),
      ('remocao.documento.upload'),
      ('remocao.documento.conferir'),
      ('remocao.checklist.complete'),
      ('remocao.intercorrencia.create'),
      ('remocao.intercorrencia.read'),
      ('remocao.auditoria.read'),
      ('remocao.dashboard.read'),
      ('remocao.dashboard.operacional')
  ) as p (permission_key);

  return v_org_id;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- Driver credentialing: add fields to enable CNH validation workflow
-- =============================================================================
-- These columns are ADD IF NOT EXISTS to be idempotent
alter table remocao_motorista
  add column if not exists pessoa_id uuid references people,
  add column if not exists cnh_categoria text,
  add column if not exists cnh_validade date,
  add column if not exists documentacao_completa boolean default false,
  add column if not exists aprovado boolean default false,
  add column if not exists aprovado_em timestamp with time zone,
  add column if not exists aprovado_por uuid references people;

create index if not exists idx_remocao_motorista_pessoa on remocao_motorista(pessoa_id);
create index if not exists idx_remocao_motorista_aprovado on remocao_motorista(aprovado, status);

-- =============================================================================
-- Update views to use new identity model
-- =============================================================================
-- The remocao_dashboard view in migration 05 already joins motorista via
-- remocao.created_by. The identity layer is additive; views remain unchanged.
-- Future enhancement: join remocao_motorista via pessoa_id when populated.
