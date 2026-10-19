-- =============================================================================
-- REMOÇÃO ALPHA — Identity Helpers, RLS Completion, and Default Tenant Setup
-- =============================================================================
-- Purpose: Complete identity layer with helper functions, default tenant creation,
-- driver credentialing fields, and any remaining RLS policies.
-- Consolidates: remaining parts of 006_identity.sql and 007_identity_rls.sql
-- =============================================================================

-- =============================================================================
-- Function: set_active_tenant(p_tenant_id uuid) — set active tenant for session
-- =============================================================================
create or replace function set_active_tenant(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership tenant_memberships%rowtype;
begin
  -- Verify user is member of this tenant with active status
  select * into v_membership
  from tenant_memberships tm
  where tm.person_id = auth.uid()
    and tm.tenant_id = p_tenant_id
    and tm.status = 'ativo'
    and (tm.expira_em is null or tm.expira_em > now());

  if not found then
    return false;
  end if;

  -- Set the request-scoped setting for this transaction
  perform set_config('request.active_tenant_id', p_tenant_id::text, true);
  return true;
end;
$$;

-- =============================================================================
-- Function: get_active_tenant() — return full tenant info
-- =============================================================================
create or replace function get_active_tenant()
returns tenants
language sql
stable
as $$
  select * from tenants where id = get_active_tenant_id();
$$;

-- =============================================================================
-- Function: create_default_tenant — create org + admin membership for new users
-- =============================================================================
create or replace function create_default_tenant(
  p_user_id uuid,
  p_user_email text,
  p_org_name text default 'Nova Organização'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_role_id uuid;
begin
  -- Generate tenant ID
  v_tenant_id := gen_random_uuid();

  -- Insert tenant
  insert into tenants (id, nome, email)
  values (v_tenant_id, p_org_name, p_user_email);

  -- Get admin role
  select id into v_role_id from roles where key = 'admin';

  -- Insert tenant membership as admin
  insert into tenant_memberships (tenant_id, person_id, role_id, status, aprovado_em)
  values (v_tenant_id, p_user_id, v_role_id, 'ativo', now());

  return v_tenant_id;
end;
$$;

-- =============================================================================
-- Function: invite_user_to_tenant — invite existing user to tenant
-- =============================================================================
create or replace function invite_user_to_tenant(
  p_inviter_id uuid,
  p_invitee_email text,
  p_tenant_id uuid,
  p_role_key text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee_id uuid;
  v_role_id uuid;
  v_membership_id uuid;
begin
  -- Verify inviter has admin permission in tenant
  if not has_permission('admin.users.manage') then
    raise exception 'Insufficient permissions to invite users';
  end if;

  if not is_tenant_member(p_tenant_id) then
    raise exception 'Inviter is not a member of this tenant';
  end if;

  -- Find or create invitee
  select id into v_invitee_id from people where email = p_invitee_email;
  if v_invitee_id is null then
    -- Invitee doesn't exist yet - they'll be created when they sign up
    -- For now, we can't create membership without person_id
    raise exception 'User must sign up first before being invited';
  end if;

  -- Get role
  select id into v_role_id from roles where key = p_role_key;
  if v_role_id is null then
    raise exception 'Invalid role: %', p_role_key;
  end if;

  -- Create membership (pending)
  insert into tenant_memberships (tenant_id, person_id, role_id, status, convidado_por, convidado_em)
  values (p_tenant_id, v_invitee_id, v_role_id, 'pendente', p_inviter_id, now())
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

-- =============================================================================
-- Driver Credentialing: approve_driver/reject_driver functions operate on
-- remocao_motorista.aprovado and remocao_motorista.documentacao_completa columns
-- defined in migration 005_remocao_core.sql.
-- =============================================================================

-- =============================================================================
-- Function: approve_driver — approve motorista for operations
-- =============================================================================
create or replace function approve_driver(
  p_motorista_id uuid,
  p_aprovador_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify approver has permission
  if not has_permission('remocao.motorista.confirm') then
    raise exception 'Insufficient permissions to approve drivers';
  end if;

  -- Update motorista
  update remocao_motorista
  set aprovado = true,
      aprovado_em = now(),
      aprovado_por = p_aprovador_id,
      documentacao_completa = true
  where id = p_motorista_id;

  return found;
end;
$$;

-- =============================================================================
-- Function: reject_driver — reject motorista
-- =============================================================================
create or replace function reject_driver(
  p_motorista_id uuid,
  p_aprovador_id uuid,
  p_motivo text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_permission('remocao.motorista.confirm') then
    raise exception 'Insufficient permissions to reject drivers';
  end if;

  update remocao_motorista
  set aprovado = false,
      aprovado_em = now(),
      aprovado_por = p_aprovador_id,
      documentacao_completa = false
  where id = p_motorista_id;

  -- Log rejection reason in observacoes
  update remocao_motorista
  set observacoes = coalesce(observacoes, '') || E'\nRejeitado: ' || p_motivo
  where id = p_motorista_id;

  return found;
end;
$$;

-- =============================================================================
-- RLS: Additional policies for people table (admin access)
-- =============================================================================
-- Admins can read all people in their tenant
create policy "people_select_tenant_admin" on people for select
  using (
    exists (
      select 1 from tenant_memberships tm
      where tm.person_id = people.id
        and tm.tenant_id = get_active_tenant_id()
        and tm.status = 'ativo'
    )
    and has_permission('admin.users.manage')
  );

-- =============================================================================
-- RLS: tenants - admin can update their tenant
-- =============================================================================
create policy "tenants_update_admin" on tenants for update
  using (
    id = get_active_tenant_id()
    and has_permission('admin.tenant.manage')
  )
  with check (
    id = get_active_tenant_id()
    and has_permission('admin.tenant.manage')
  );

-- =============================================================================
-- RLS: roles - admin can manage roles
-- =============================================================================
create policy "roles_insert_admin" on roles for insert
  with check (has_permission('admin.roles.manage'));
create policy "roles_update_admin" on roles for update
  using (has_permission('admin.roles.manage'))
  with check (has_permission('admin.roles.manage'));
create policy "roles_delete_admin" on roles for delete
  using (has_permission('admin.roles.manage') and not sistema);

-- =============================================================================
-- RLS: permissions - admin can manage permissions
-- =============================================================================
create policy "permissions_insert_admin" on permissions for insert
  with check (has_permission('admin.roles.manage'));
create policy "permissions_update_admin" on permissions for update
  using (has_permission('admin.roles.manage'))
  with check (has_permission('admin.roles.manage'));

-- =============================================================================
-- RLS: role_permissions - admin can manage role-permission mappings
-- =============================================================================
create policy "role_permissions_insert_admin" on role_permissions for insert
  with check (has_permission('admin.roles.manage'));
create policy "role_permissions_delete_admin" on role_permissions for delete
  using (has_permission('admin.roles.manage'));

-- =============================================================================
-- RLS: SELECT policies for authorization metadata
--     IMPORTANT: The restricted SELECT policies for roles, permissions,
--     and role_permissions are defined in migration 010 because they
--     reference root_privileges which does not exist yet at this point.
--     The permissive policies from migration 001 remain active until 010
--     replaces them with DROP POLICY IF EXISTS.
-- =============================================================================
-- NOTE: Migration 001 created permissive policies (using true) on these tables.
-- Migration 010 will replace them with restricted policies that check
-- root_privileges. No action needed here.