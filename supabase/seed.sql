-- =============================================================================
-- RemocaoAlpha — Development Seed (idempotent)
-- =============================================================================
-- PURPOSE: Create a development admin user for local testing.
-- ENVIRONMENT: LOCAL Supabase only (requires Docker + supabase start).
-- DO NOT run against remote/production without explicit authorization.
-- =============================================================================

-- This seed assumes migrations 001-012 have been applied.
-- It creates:
--   1. A tenant for development
--   2. A person record for the dev admin
--   3. A tenant_membership linking person to tenant with admin_gestao role
--
-- The auth.users identity must be created via Supabase Auth (not SQL).
-- Use: supabase auth signup --email dev@remocaoalpha.local --password <dev-password>
-- Or via Supabase Studio at http://localhost:54323
--
-- After creating the auth user, run this seed with the auth user's UUID:
--   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v auth_uid="'<uuid>'" -f seed.sql
-- =============================================================================

-- Idempotent tenant creation
INSERT INTO tenants (id, nome, ativo, criado_em)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant Demonstração', true, now())
ON CONFLICT (id) DO NOTHING;

-- Idempotent person creation (uses auth.uid from variable)
INSERT INTO people (id, nome, email, password_reset_required, criado_em)
VALUES (:'auth_uid'::uuid, 'Admin Demonstração', 'dev@remocaoalpha.local', false, now())
ON CONFLICT (id) DO NOTHING;

-- Idempotent membership creation
INSERT INTO tenant_memberships (tenant_id, person_id, papel, status, aprovado_em, convidado_em)
VALUES ('00000000-0000-0000-0000-000000000001', :'auth_uid'::uuid, 'admin', 'ativo', now(), now())
ON CONFLICT (tenant_id, person_id) DO NOTHING;

-- =============================================================================
-- BLOCKER: Cannot execute without local Supabase (Docker required).
-- supabase start requires Docker Desktop, which is not available in this environment.
-- =============================================================================
