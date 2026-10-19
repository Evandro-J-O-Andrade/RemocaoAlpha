-- =============================================================================
-- REMOÇÃO ALPHA — Identity & Organization Layer (Migration 006)
-- New Wave Sistema Digital
-- =============================================================================
-- Purpose: Establish the identity model that all remocao tables depend on.
-- This migration creates organizations (tenants), people (identity),
-- tenant_memberships (person ↔ organization with role), and role_assignments
-- (fine-grained permissions).
--
-- The existing migrations (000-005) use `tenant_id uuid references auth.users`.
-- Migration 007 updates get_tenant_id() and has_permission() to resolve
-- through the new tables while maintaining backward compatibility.
-- =============================================================================

-- =============================================================================
-- Organizations (multi-tenant owners)
-- =============================================================================
create table if not exists organizations (
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

create unique index idx_organizations_cnpj on organizations(cnpj) where cnpj is not null;

-- =============================================================================
-- People (identity — maps to auth.users.id)
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

create index idx_people_email on people(email);
create unique index idx_people_cpf on people(cpf) where cpf is not null;

-- =============================================================================
-- Tenant memberships (person belongs to organization with a role)
-- =============================================================================
create type remocao_people_status as enum (
  'ativo',
  'inativo',
  'suspenso'
);

create table if not exists tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references organizations not null,
  person_id uuid references people not null,
  papel text not null, -- 'admin', 'motorista', 'enfermeiro', 'medico', 'atendente', 'gestor'
  status remocao_people_status default 'ativo',
  aprovado_em timestamp with time zone,
  aprovado_por uuid references people,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (tenant_id, person_id)
);

create index idx_tenant_memberships_tenant on tenant_memberships(tenant_id);
create index idx_tenant_memberships_person on tenant_memberships(person_id);
create index idx_tenant_memberships_papel on tenant_memberships(papel);

-- =============================================================================
-- Role assignments (fine-grained permissions)
-- =============================================================================
create table if not exists role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references organizations not null,
  person_id uuid references people not null,
  permission_key text not null,
  concedido_por uuid references people,
  concedido_at timestamp with time zone default now(),
  expira_em timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (tenant_id, person_id, permission_key)
);

create index idx_role_assignments_person on role_assignments(person_id);
create index idx_role_assignments_tenant on role_assignments(tenant_id);

-- =============================================================================
-- Trigger: auto-create people row when auth.users row is created
-- This ensures identity stays in sync with authentication.
-- =============================================================================
create or replace function public.handle_new_user_create_person()
returns trigger
language 'plpgsql'
security definer
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
