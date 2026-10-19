-- =============================================================================
-- REMOÇÃO ALPHA — Tenant Memberships and Role Assignments
-- =============================================================================
-- Purpose: Link people to tenants with roles, enabling multi-tenant access control
-- Replaces: parts of 006_identity.sql and 007_identity_rls.sql
-- =============================================================================

-- =============================================================================
-- Membership status enum
-- =============================================================================
create type membership_status as enum (
  'pendente',
  'ativo',
  'inativo',
  'suspenso',
  'expirado'
);

-- =============================================================================
-- Tenant Memberships — person belongs to tenant with a role
-- =============================================================================
create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  person_id uuid references people(id) on delete cascade not null,
  role_id uuid references roles(id) on delete restrict not null,
  status membership_status default 'pendente',
  convidado_por uuid references people(id),
  convidado_em timestamp with time zone default now(),
  aprovado_por uuid references people(id),
  aprovado_em timestamp with time zone,
  expira_em timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, person_id)
);

create index if not exists idx_tenant_memberships_tenant on tenant_memberships(tenant_id);
create index if not exists idx_tenant_memberships_person on tenant_memberships(person_id);
create index if not exists idx_tenant_memberships_role on tenant_memberships(role_id);
create index if not exists idx_tenant_memberships_status on tenant_memberships(status) where status = 'ativo';

-- =============================================================================
-- Function: get_active_tenant_id() — resolves active tenant from memberships
--     Returns NULL when no valid tenant context exists.
--     NEVER falls back to auth.uid() — a user ID is not a tenant ID.
--     CRITICAL: Validates request.active_tenant_id against user membership
--     to prevent context spoofing. If the setting is invalid, falls back
--     to the user's own active membership.
-- =============================================================================
create or replace function get_active_tenant_id()
returns uuid
language sql
stable
as $$
  select
    case
      -- Validate the request setting: user must have active membership in this tenant
      when nullif(current_setting('request.active_tenant_id', true), '') IS NOT NULL
        and exists (
          select 1 from tenant_memberships tm
          where tm.person_id = auth.uid()
            and tm.tenant_id = nullif(current_setting('request.active_tenant_id', true), '')::uuid
            and tm.status = 'ativo'
            and (tm.expira_em is null or tm.expira_em > now())
        )
        then nullif(current_setting('request.active_tenant_id', true), '')::uuid
      -- Fallback: user's own active membership (most recent approval)
      else (
        select tm.tenant_id
        from tenant_memberships tm
        where tm.person_id = auth.uid()
          and tm.status = 'ativo'
          and (tm.expira_em is null or tm.expira_em > now())
        order by tm.aprovado_em desc nulls last
        limit 1
      )
    end;
$$;

-- =============================================================================
-- Function: get_current_person_id() — resolves current person
-- =============================================================================
create or replace function get_current_person_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.person_id', true), '')::uuid,
    auth.uid()
  );
$$;

-- =============================================================================
-- Function: has_permission(p_permission text) — real RBAC check
-- =============================================================================
create or replace function has_permission(p_permission text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from tenant_memberships tm
    join role_permissions rp on rp.role_id = tm.role_id
    join permissions p on p.id = rp.permission_id
    where tm.person_id = auth.uid()
      and tm.tenant_id = get_active_tenant_id()
      and tm.status = 'ativo'
      and (tm.expira_em is null or tm.expira_em > now())
      and p.key = p_permission
  );
$$;

-- =============================================================================
-- Function: is_tenant_member(p_tenant_id uuid) — check membership
-- =============================================================================
create or replace function is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from tenant_memberships tm
    where tm.person_id = auth.uid()
      and tm.tenant_id = p_tenant_id
      and tm.status = 'ativo'
      and (tm.expira_em is null or tm.expira_em > now())
  );
$$;

-- =============================================================================
-- Function: get_user_tenant_roles(p_tenant_id uuid) — get user roles in tenant
-- =============================================================================
create or replace function get_user_tenant_roles(p_tenant_id uuid)
returns setof roles
language sql
stable
as $$
  select r.*
  from tenant_memberships tm
  join roles r on r.id = tm.role_id
  where tm.person_id = auth.uid()
    and tm.tenant_id = p_tenant_id
    and tm.status = 'ativo'
    and (tm.expira_em is null or tm.expira_em > now());
$$;

-- =============================================================================
-- Enable RLS on tenant_memberships
-- =============================================================================
alter table tenant_memberships enable row level security;

-- =============================================================================
-- RLS Policies — Tenant Memberships
-- =============================================================================

-- Users can see their own memberships
create policy "tenant_memberships_select_own" on tenant_memberships for select
  using (person_id = auth.uid());

-- Users can see memberships in their active tenant (for admin UI)
create policy "tenant_memberships_select_tenant" on tenant_memberships for select
  using (tenant_id = get_active_tenant_id());

-- Admins can insert memberships in their tenant
create policy "tenant_memberships_insert_admin" on tenant_memberships for insert
  with check (
    tenant_id = get_active_tenant_id()
    and has_permission('admin.users.manage')
  );

-- Admins can update memberships in their tenant
create policy "tenant_memberships_update_admin" on tenant_memberships for update
  using (
    tenant_id = get_active_tenant_id()
    and has_permission('admin.users.manage')
  )
  with check (
    tenant_id = get_active_tenant_id()
    and has_permission('admin.users.manage')
  );

-- =============================================================================
-- Trigger: updated_at for tenant_memberships
-- =============================================================================
create or replace function update_tenant_memberships_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_tenant_memberships_updated_at on tenant_memberships;
create trigger trigger_tenant_memberships_updated_at
  before update on tenant_memberships
  for each row
  execute function update_tenant_memberships_updated_at();