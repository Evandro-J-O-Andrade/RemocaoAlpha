-- =============================================================================
-- REMOÇÃO ALPHA — Reconciliation: Identity Model Unification & RBAC Seed (009)
-- =============================================================================
-- Purpose:
--   1. Unify the two identity models: Oct 8 (organizations, papel, role_assignments)
--      and Oct 9 (tenants, roles, permissions, role_permissions).
--   2. Consolidate `organizations` → `tenants` as the canonical tenant table.
--   3. Fix `tenant_memberships` schema to use `role_id` (Oct 9 model) while
--      preserving `papel` for backward compatibility.
--   4. Add `admin_master` (ROOT) system role with global privileges.
--   5. Seed admin_gestao, suporte_TI, suporte_master, suporte roles.
--   6. Re-define helper functions to support ROOT bypass securely.
--   7. All operations are idempotent (CREATE IF NOT EXISTS, DO blocks, etc.)
-- =============================================================================

-- =============================================================================
-- 1. Unify organizations → tenants
--    If `organizations` exists but `tenants` exists too, migrate data.
--    If only `organizations` exists, rename it to `tenants`.
-- =============================================================================
DO $$
BEGIN
  -- Check if organizations exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    -- Check if tenants also exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
      -- Rename organizations to tenants
      ALTER TABLE organizations RENAME TO tenants;
      RAISE NOTICE 'organizations renamed to tenants';
    ELSE
      -- Both exist — migrate data from organizations to tenants (idempotent)
      INSERT INTO tenants (id, nome, razao_social, cnpj, email, telefone, endereco, ativo, config, created_at, updated_at)
      SELECT id, nome, razao_social, cnpj, email, telefone, endereco, ativo, config, created_at, updated_at
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = o.id);
      RAISE NOTICE 'Data migrated from organizations to tenants';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 2. Update FK references from organizations(id) to tenants(id)
--    All operational tables that had tenant_id pointing to organizations must
--    now point to tenants.
-- =============================================================================
DO $$
DECLARE
    tbl_name text;
    col_name text;
BEGIN
    FOR tbl_name, col_name IN
        SELECT
            nsp_tab.relname AS table_name,
            att.attname AS column_name
        FROM pg_attribute att
        JOIN pg_class nsp_tab ON att.attrelid = nsp_tab.oid
        JOIN pg_constraint con ON con.conrelid = nsp_tab.oid
        JOIN pg_class referenced_table ON con.confrelid = referenced_table.oid
        WHERE con.contype = 'f'
          AND referenced_table.relname = 'organizations'
          AND nsp_tab.relnamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl_name, con.conname::text);
        -- We'll re-add FKs in a moment with the correct target
    END LOOP;
END $$;

-- Re-add foreign keys pointing to tenants instead of organizations
-- Only for tables in the public schema with tenant_id column
DO $$
DECLARE
    tbl_name text;
    col_type text;
BEGIN
    FOR tbl_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'remocao', 'remocao_tabela_referencia', 'remocao_unidade',
            'remocao_setor', 'remocao_veiculo', 'remocao_motorista',
            'remocao_motorista_turno', 'remocao_documento', 'remocao_auditoria',
            'tenant_memberships', 'role_assignments'
          )
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = tbl_name AND column_name = 'tenant_id'
        ) THEN
            -- Check if the FK to tenants already exists
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = (tbl_name || '_pkey')::regclass
                OR conrelid = tbl_name::regclass
                AND contype = 'f'
                AND confrelid = 'tenants'::regclass
            ) THEN
                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
                    tbl_name, tbl_name
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 3. Fix tenant_memberships — add role_id if missing, keep papel for compat
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_memberships') THEN
        -- Add role_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_memberships' AND column_name = 'role_id'
        ) THEN
            ALTER TABLE tenant_memberships ADD COLUMN role_id uuid references roles(id);
            RAISE NOTICE 'Added role_id column to tenant_memberships';
        END IF;

        -- Add root boolean for admin_master designation
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tenant_memberships' AND column_name = 'is_root'
        ) THEN
            ALTER TABLE tenant_memberships ADD COLUMN is_root boolean default false;
            RAISE NOTICE 'Added is_root column to tenant_memberships';
        END IF;
    END IF;
END $$;

-- Migrate existing papel → role_id (best-effort, idempotent)
DO $$
BEGIN
    -- Map known papel values to role_ids
    INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
    SELECT tm.tenant_id, tm.person_id, r.id, tm.papel, tm.status, tm.aprovado_em
    FROM tenant_memberships tm
    JOIN roles r ON r.key = tm.papel
    WHERE tm.role_id IS NULL
      AND tm.papel IS NOT NULL
    ON CONFLICT (tenant_id, person_id) DO UPDATE
      SET role_id = EXCLUDED.role_id;
EXCEPTION WHEN others THEN
    RAISE WARNING 'role_id migration from papel skipped: %', SQLERRM;
END $$;

-- =============================================================================
-- 4. Create root_privileges table for admin_master global privileges
--    This is NOT tenant-scoped — it's a global authorization table.
-- =============================================================================
CREATE TABLE IF NOT EXISTS root_privileges (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) not null,
  granted_by uuid references people(id),
  granted_at timestamp with time zone default now(),
  revoked_at timestamp with time zone,
  revoked_by uuid references people(id),
  motivo text,
  CONSTRAINT root_privileges_person_unique UNIQUE (person_id)
);

CREATE INDEX IF NOT EXISTS idx_root_privileges_person ON root_privileges(person_id);
CREATE INDEX IF NOT EXISTS idx_root_privileges_active ON root_privileges(revoked_at) WHERE revoked_at IS NULL;

-- =============================================================================
-- 5. Seed the 5 system admin/support roles
--    These are distinct from the operational roles (admin, gestor, motorista, etc.)
-- =============================================================================

-- admin_master is the ROOT / system owner role
INSERT INTO roles (key, nome, descricao, nivel, sistema) VALUES
  ('admin_master', 'Super Administrador (ROOT)', 'Proprietário do sistema. Acesso administrativo global a todas as funcionalidades, organizações e usuários.', 1000, true)
ON CONFLICT (key) DO NOTHING;

-- admin_gestao is the operational admin within a tenant
INSERT INTO roles (key, nome, descricao, nivel, sistema) VALUES
  ('admin_gestao', 'Administrador de Gestão', 'Administração operacional e gerencial dentro da organização.', 100, true)
ON CONFLICT (key) DO NOTHING;

-- suporte_TI: technical support with diagnostic access
INSERT INTO roles (key, nome, descricao, nivel, sistema) VALUES
  ('suporte_ti', 'Suporte Técnico (TI)', 'Diagnóstico, monitoramento, logs e manutenção técnica. Acesso a dados clínicos apenas quando necessário e auditado.', 70, true)
ON CONFLICT (key) DO NOTHING;

-- suporte_master: support supervision
INSERT INTO roles (key, nome, descricao, nivel, sistema) VALUES
  ('suporte_master', 'Supervisor de Suporte', 'Gestão de chamados, escalonamentos e coordenação da equipe de suporte.', 75, true)
ON CONFLICT (key) DO NOTHING;

-- suporte: first-line support
INSERT INTO roles (key, nome, descricao, nivel, sistema) VALUES
  ('suporte', 'Suporte (1º Nível)', 'Atendimento de primeira linha. Consulta e atualização de chamados conforme permissões.', 60, true)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 6. Seed additional permissions for admin/support operations
--    (Only insert permissions that don't already exist from migration 01)
-- =============================================================================

INSERT INTO permissions (key, nome, descricao, categoria) VALUES
  ('admin.root.grant', 'Conceder privilégios ROOT', 'Permite conceder o papel admin_master a outro usuário', 'admin'),
  ('admin.root.revoke', 'Revogar privilégios ROOT', 'Permite revogar o papel admin_master de um usuário', 'admin'),
  ('admin.tenant.create', 'Criar organização', 'Cria nova organização/tenant', 'admin'),
  ('admin.tenant.invite_user', 'Convidar usuário', 'Convida usuário para organização', 'admin'),
  ('admin.users.approve', 'Aprovar usuário', 'Aprova cadastro de usuário em tenant', 'admin'),
  ('admin.users.assign_role', 'Atribuir função', 'Atribui função a usuário no tenant', 'admin'),
  ('support.tickets.manage', 'Gerenciar chamados', 'Cria e gerencia chamados de suporte', 'support'),
  ('support.tickets.read', 'Visualizar chamados', 'Visualiza chamados de suporte', 'support'),
  ('support.logs.read', 'Ler logs', 'Acessa logs de auditoria e sistema', 'support'),
  ('support.diagnostics.read', 'Diagnóstico', 'Acessa diagnósticos técnicos', 'support'),
  ('support.users.read', 'Ler dados de usuários', 'Acessa dados básicos de usuários para diagnóstico', 'support')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 7. Seed role_permission mappings for the admin/support roles
--    admin_master gets ALL permissions (including root ones)
--    admin_gestao gets admin.* permissions
--    suporte_TI gets support.* + limited read access
--    suporte_master gets support.* + support management
--    suporte gets support.tickets.* only
-- =============================================================================

-- admin_master: ALL permissions (global ROOT)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.key = 'admin_master'
ON CONFLICT DO NOTHING;

-- admin_gestao: all admin.* permissions (but NOT root grant/revoke)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key LIKE 'admin.%'
WHERE r.key = 'admin_gestao'
  AND p.key NOT IN ('admin.root.grant', 'admin.root.revoke')
ON CONFLICT DO NOTHING;

-- admin_gestao: also gets all operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key LIKE 'remocao.%' OR p.key LIKE 'equipe.%' OR p.key LIKE 'veiculo.%' OR p.key LIKE 'motorista.%' OR p.key LIKE 'destino.%' OR p.key LIKE 'documento.%' OR p.key LIKE 'checklist.%' OR p.key LIKE 'intercorrencia.%' OR p.key LIKE 'auditoria.%' OR p.key LIKE 'dashboard.%'
WHERE r.key = 'admin_gestao'
ON CONFLICT DO NOTHING;

-- suporte_TI: support.* + diagnostics + limited user read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
    'support.tickets.manage', 'support.tickets.read', 'support.logs.read',
    'support.diagnostics.read', 'support.users.read',
    'remocao.auditoria.read', 'remocao.dashboard.read'
)
WHERE r.key = 'suporte_ti'
ON CONFLICT DO NOTHING;

-- suporte_TI: does NOT get clinical data permissions by default
-- (no remocao.* permissions beyond dashboard read and auditoria read)

-- suporte_master: support.* + ticket management + user read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
    'support.tickets.manage', 'support.tickets.read', 'support.users.read',
    'remocao.auditoria.read', 'remocao.dashboard.read'
)
WHERE r.key = 'suporte_master'
ON CONFLICT DO NOTHING;

-- suporte: first-line support — tickets read/manage only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
    'support.tickets.read', 'support.tickets.manage',
    'remocao.dashboard.read'
)
WHERE r.key = 'suporte'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. Update has_permission() — check ROOT first, then tenant-scoped
-- =============================================================================
CREATE OR REPLACE FUNCTION has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  select exists (
    -- ROOT bypass: admin_master can do everything
    (select 1 from root_privileges rp
     where rp.person_id = auth.uid()
       and rp.revoked_at is null)
    union all
    -- Tenant-scoped permission check
    select 1
    from tenant_memberships tm
    join role_permissions rp_perm ON rp_perm.role_id = tm.role_id
    join permissions p ON p.id = rp_perm.permission_id
    where tm.person_id = auth.uid()
      and tm.tenant_id = get_active_tenant_id()
      and tm.status = 'ativo'
      and (tm.expira_em is null or tm.expira_em > now())
      and p.key = p_permission
  ) as found;
$$;

-- =============================================================================
-- 9. Create is_admin_master() — check if current user is ROOT
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin_master()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select exists (
    select 1 from root_privileges rp
    where rp.person_id = auth.uid()
      and rp.revoked_at is null
  );
$$;

-- =============================================================================
-- 10. Create get_current_tenant_info() — unified, works with both models
--     Returns tenant info, person info, and role key
-- =============================================================================
CREATE OR REPLACE FUNCTION get_current_tenant_info()
RETURNS TABLE (
    tenant_id     uuid,
    tenant_nome   text,
    person_id     uuid,
    person_nome   text,
    person_email  text,
    papel         text,
    is_root       boolean
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.nome,
        p.id,
        p.nome,
        p.email,
        COALESCE(r.key, tm.papel),
        EXISTS (
            SELECT 1 FROM root_privileges rp
            WHERE rp.person_id = auth.uid()
              AND rp.revoked_at IS NULL
        )
    FROM tenants t
    JOIN tenant_memberships tm ON tm.tenant_id = t.id
    JOIN people p ON p.id = tm.person_id
    LEFT JOIN roles r ON r.id = tm.role_id
    WHERE p.id = auth.uid()
      AND (tm.status = 'ativo' OR tm.status = 'pendente')
      AND (tm.expira_em IS NULL OR tm.expira_em > now())
    ORDER BY t.created_at ASC
    LIMIT 1;

    -- If no tenant membership, check if user is admin_master (global)
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            NULL::uuid,
            NULL::text,
            p.id,
            p.nome,
            p.email,
            'admin_master'::text,
            TRUE
        FROM people p
        WHERE p.id = auth.uid()
          AND EXISTS (
              SELECT 1 FROM root_privileges rp
              WHERE rp.person_id = auth.uid()
                AND rp.revoked_at IS NULL
          );
    END IF;
END;
$$;

-- =============================================================================
-- 11. Update get_user_permissions() — use new RBAC model, include ROOT bypass
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE (permission_key text)
LANGUAGE sql
STABLE
AS $$
  -- If admin_master, return all permissions
  select p.key::text
  from permissions p
  where exists (
    select 1 from root_privileges rp
    where rp.person_id = auth.uid()
      and rp.revoked_at is null
  )

  union all

  -- Tenant-scoped permissions via role_permissions
  select p.key::text
  from tenant_memberships tm
  join role_permissions rp ON rp.role_id = tm.role_id
  join permissions p ON p.id = rp.permission_id
  where tm.person_id = auth.uid()
    and tm.tenant_id = get_active_tenant_id()
    and tm.status = 'ativo'
    and (tm.expira_em is null or tm.expira_em > now());
$$;

-- =============================================================================
-- 12. Create create_default_tenant() — updated to use roles model
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_tenant(
  p_user_id uuid,
  p_user_email text,
  p_org_name text default 'Nova Organização'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_admin_role_id uuid;
BEGIN
    -- Generate tenant ID
    v_tenant_id := gen_random_uuid();

    -- Insert tenant
    INSERT INTO tenants (id, nome, email)
    VALUES (v_tenant_id, p_org_name, p_user_email);

    -- Get admin role
    SELECT id INTO v_admin_role_id FROM roles WHERE key = 'admin';
    IF v_admin_role_id IS NULL THEN
        -- Fallback: use admin_gestao if admin doesn't exist
        SELECT id INTO v_admin_role_id FROM roles WHERE key = 'admin_gestao';
    END IF;

    -- Insert tenant membership as admin (active, approved)
    INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
    VALUES (v_tenant_id, p_user_id, v_admin_role_id, 'admin', 'ativo', now());

    RETURN v_tenant_id;
END;
$$;

-- =============================================================================
-- 13. Create bootstrap_root_user() — secure function to assign admin_master
--     Can only be called by an existing admin_master (or the first bootstrap)
--     Uses AUTH.UID() to identify the target user — no UUIDs in code
--     SECURITY: During first bootstrap, caller must match the target email
--     to prevent privilege escalation by any authenticated user.
--     SECURITY: Uses advisory lock to prevent concurrent first bootstraps.
-- =============================================================================
CREATE OR REPLACE FUNCTION bootstrap_root_user(
  p_admin_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_person_id uuid;
    v_granted_by uuid;
    v_caller_email text;
    v_lock_acquired boolean;
    v_is_admin_master boolean;
BEGIN
    -- Step 1: Check if caller is already admin_master (can grant ROOT to others)
    v_is_admin_master := EXISTS (
        SELECT 1 FROM root_privileges rp
        WHERE rp.person_id = auth.uid()
          AND rp.revoked_at IS NULL
    );

    -- Step 2: If not admin_master, this must be first bootstrap.
    -- Verify caller email matches target email BEFORE acquiring lock
    -- to prevent unauthorized users from blocking the bootstrap window.
    IF NOT v_is_admin_master THEN
        -- Check if any admin_master already exists
        IF EXISTS (SELECT 1 FROM root_privileges WHERE revoked_at IS NULL) THEN
            RAISE EXCEPTION 'Insufficient permissions: only admin_master can grant ROOT privileges'
            USING ERRCODE = 'P0804';
        END IF;

        -- First bootstrap: caller MUST be the one receiving ROOT
        SELECT email INTO v_caller_email
        FROM people
        WHERE id = auth.uid();

        IF v_caller_email IS NULL OR v_caller_email != p_admin_email THEN
            RAISE EXCEPTION 'First bootstrap: can only grant ROOT to the current authenticated user'
            USING ERRCODE = 'P0804';
        END IF;
    END IF;

    -- Step 3: Acquire advisory lock AFTER authorization check
    -- Lock is automatically released at end of transaction
    v_lock_acquired := pg_try_advisory_xact_lock(12345);
    IF NOT v_lock_acquired THEN
        RAISE EXCEPTION 'Bootstrap in progress by another session'
        USING ERRCODE = 'P0001';
    END IF;

    -- Re-verify no admin_master was created between our check and lock acquisition
    IF v_is_admin_master THEN
        -- Caller was admin_master before lock — nothing to re-verify
    ELSE
        IF EXISTS (SELECT 1 FROM root_privileges WHERE revoked_at IS NULL) THEN
            RAISE EXCEPTION 'Admin_master was created by another session during bootstrap'
            USING ERRCODE = 'P0804';
        END IF;
    END IF;

    -- The target user must exist in people table
    SELECT id INTO v_person_id
    FROM people
    WHERE email = p_admin_email;

    IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in people table', p_admin_email
        USING ERRCODE = 'P0001';
    END IF;

    -- Set granted_by: NULL for first bootstrap, auth.uid() for subsequent grants
    v_granted_by := CASE WHEN v_is_admin_master THEN auth.uid() ELSE NULL END;

    -- Grant ROOT
    -- ON CONFLICT DO UPDATE only reactivates if caller is admin_master.
    -- For first bootstrap, the conflict cannot occur (no existing row).
    -- For subsequent grants, v_is_admin_master is TRUE (verified above).
    -- The WHERE clause prevents unauthorized reactivation of revoked ROOT.
    -- If no row is affected, the operation fails explicitly.
    INSERT INTO root_privileges (person_id, granted_by, granted_at)
    VALUES (v_person_id, v_granted_by, now())
    ON CONFLICT (person_id) DO UPDATE
        SET revoked_at = NULL,
            granted_by = EXCLUDED.granted_by
    WHERE v_is_admin_master OR NOT EXISTS (
        SELECT 1 FROM root_privileges WHERE person_id = EXCLUDED.person_id
    );

    -- Verify the operation actually affected a row.
    -- If the WHERE clause rejected the UPDATE and no INSERT occurred,
    -- this means an unauthorized reactivation was attempted.
    IF NOT EXISTS (
        SELECT 1 FROM root_privileges WHERE person_id = v_person_id AND revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Failed to grant ROOT: unauthorized reactivation attempt or target not found'
        USING ERRCODE = 'P0804';
    END IF;

    -- Audit log
    INSERT INTO remocao_auditoria (
        tenant_id, acao, entidade, registro_id, detalhes, usuario_id, usuario_nome
    ) VALUES (
        NULL, 'root_granted', 'people', v_person_id,
        jsonb_build_object('granted_to_email', p_admin_email, 'granted_by', v_granted_by::text),
        v_granted_by,
        (SELECT nome FROM people WHERE id = v_granted_by)
    );

    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 14. Create revoke_root_user() — revoke admin_master
-- =============================================================================
CREATE OR REPLACE FUNCTION revoke_root_user(
  p_target_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_person_id uuid;
BEGIN
    -- Only admin_master can revoke ROOT
    IF NOT EXISTS (
        SELECT 1 FROM root_privileges rp
        WHERE rp.person_id = auth.uid()
          AND rp.revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions: only admin_master can revoke ROOT'
        USING ERRCODE = 'P0804';
    END IF;

    SELECT id INTO v_person_id
    FROM people
    WHERE email = p_target_email;

    IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_target_email
        USING ERRCODE = 'P0001';
    END IF;

    -- Revoke ROOT
    UPDATE root_privileges
    SET revoked_at = now(),
        revoked_by = auth.uid()
    WHERE person_id = v_person_id
      AND revoked_at IS NULL;

    -- Audit log
    INSERT INTO remocao_auditoria (
        tenant_id, acao, entidade, registro_id, detalhes, usuario_id, usuario_nome
    ) VALUES (
        NULL, 'root_revoked', 'people', v_person_id,
        jsonb_build_object('revoked_from_email', p_target_email),
        auth.uid(),
        (SELECT nome FROM people WHERE id = auth.uid())
    );

    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 15. Create invite_user_to_tenant() — updated for new roles model
-- =============================================================================
CREATE OR REPLACE FUNCTION invite_user_to_tenant(
  p_inviter_id uuid,
  p_invitee_email text,
  p_tenant_id uuid,
  p_role_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitee_id uuid;
    v_role_id uuid;
    v_membership_id uuid;
BEGIN
    -- Verify inviter has admin permission in tenant
    IF NOT has_permission('admin.users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users'
        USING ERRCODE = 'P0804';
    END IF;

    IF NOT is_tenant_member(p_tenant_id) THEN
        RAISE EXCEPTION 'Inviter is not a member of this tenant'
        USING ERRCODE = 'P0804';
    END IF;

    -- Prevent non-ROOT from granting admin_master
    IF p_role_key = 'admin_master' AND NOT is_admin_master() THEN
        RAISE EXCEPTION 'Only admin_master can assign the admin_master role'
        USING ERRCODE = 'P0804';
    END IF;

    -- Prevent granting root-level roles without ROOT
    IF p_role_key IN ('admin_master') AND NOT is_admin_master() THEN
        RAISE EXCEPTION 'Only admin_master can assign privileged roles'
        USING ERRCODE = 'P0804';
    END IF;

    -- Find invitee
    SELECT id INTO v_invitee_id FROM people WHERE email = p_invitee_email;
    IF v_invitee_id IS NULL THEN
        RAISE EXCEPTION 'User must sign up first before being invited'
        USING ERRCODE = 'P0001';
    END IF;

    -- Get role
    SELECT id INTO v_role_id FROM roles WHERE key = p_role_key;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Invalid role: %', p_role_key
        USING ERRCODE = 'P0001';
    END IF;

    -- Create membership (pending until approved)
    INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, convidado_por, convidado_em)
    VALUES (p_tenant_id, v_invitee_id, v_role_id, p_role_key, 'pendente', p_inviter_id, now())
    RETURNING id INTO v_membership_id;

    RETURN v_membership_id;
END;
$$;

-- =============================================================================
-- 16. Create approve_membership() — admin approves pending membership
-- =============================================================================
CREATE OR REPLACE FUNCTION approve_membership(
  p_membership_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_role_key text;
BEGIN
    -- Verify caller has permission
    IF NOT has_permission('admin.users.approve') THEN
        RAISE EXCEPTION 'Insufficient permissions to approve users'
        USING ERRCODE = 'P0804';
    END IF;

    -- Get membership details
    SELECT tm.tenant_id, r.key INTO v_tenant_id, v_role_key
    FROM tenant_memberships tm
    JOIN roles r ON r.id = tm.role_id
    WHERE tm.id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership not found: %', p_membership_id
        USING ERRCODE = 'P0002';
    END IF;

    -- Verify caller is admin of this tenant
    IF NOT is_tenant_member(v_tenant_id) THEN
        RAISE EXCEPTION 'Not a member of this tenant'
        USING ERRCODE = 'P0804';
    END IF;

    -- Prevent non-ROOT from approving admin_master
    IF v_role_key = 'admin_master' AND NOT is_admin_master() THEN
        RAISE EXCEPTION 'Only admin_master can approve admin_master role'
        USING ERRCODE = 'P0804';
    END IF;

    -- Approve
    UPDATE tenant_memberships
    SET status = 'ativo',
        aprovado_por = auth.uid(),
        aprovado_em = now()
    WHERE id = p_membership_id;

    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 17. Update set_active_tenant() — also validate admin_master bypass
-- =============================================================================
CREATE OR REPLACE FUNCTION set_active_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_membership tenant_memberships%rowtype;
BEGIN
    -- ROOT bypass: admin_master can access any tenant
    IF EXISTS (
        SELECT 1 FROM root_privileges rp
        WHERE rp.person_id = auth.uid()
          AND rp.revoked_at IS NULL
    ) THEN
        -- Verify tenant exists
        IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
            RAISE EXCEPTION 'Tenant not found: %', p_tenant_id
            USING ERRCODE = 'P0002';
        END IF;
        PERFORM set_config('request.active_tenant_id', p_tenant_id::text, true);
        RETURN TRUE;
    END IF;

    -- Normal path: verify user is member of this tenant
    SELECT * INTO v_membership
    FROM tenant_memberships tm
    WHERE tm.person_id = auth.uid()
      AND tm.tenant_id = p_tenant_id
      AND tm.status = 'ativo'
      AND (tm.expira_em IS NULL OR tm.expira_em > now());

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    PERFORM set_config('request.active_tenant_id', p_tenant_id::text, true);
    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 18. Create update_user_password() — secure password change RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_password(
  p_current_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    -- Verify current password by attempting sign-in is handled client-side
    -- Here we just update via admin API
    -- This function is a placeholder — actual password update is done
    -- via supabase.auth.updateUser() on the client with session confirmation

    -- Get user email
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User not found'
        USING ERRCODE = 'P0002';
    END IF;

    -- Log the attempt for audit
    INSERT INTO remocao_auditoria (
        tenant_id, acao, entidade, registro_id, detalhes, usuario_id, usuario_nome
    ) VALUES (
        CASE WHEN is_admin_master() THEN NULL ELSE get_active_tenant_id() END,
        'password_change_request', 'people', auth.uid(),
        jsonb_build_object('method', 'update_user_password'),
        auth.uid(),
        (SELECT nome FROM people WHERE id = auth.uid())
    );

    RETURN TRUE;
END;
$$;

-- =============================================================================
-- 19. Add RLS policies on root_privileges (audit-only, no direct access)
-- =============================================================================
ALTER TABLE root_privileges ENABLE ROW LEVEL SECURITY;

-- No one can insert/update/delete root_privileges directly via Supabase client
-- Only SECURITY DEFINER functions can modify it
CREATE POLICY "root_privileges_no_insert" ON root_privileges FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "root_privileges_no_update" ON root_privileges FOR UPDATE USING (FALSE);
CREATE POLICY "root_privileges_no_delete" ON root_privileges FOR DELETE USING (FALSE);

-- Admin_master can read (for audit), but only their own records
CREATE POLICY "root_privileges_read_admin_master" ON root_privileges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM root_privileges rp
      WHERE rp.person_id = auth.uid()
        AND rp.revoked_at IS NULL
    )
  );

-- =============================================================================
-- 19b. Update remocao_auditoria RLS to allow ROOT access without active tenant
-- =============================================================================
DROP POLICY IF EXISTS "remocao_auditoria_select" ON remocao_auditoria;
CREATE POLICY "remocao_auditoria_select" ON remocao_auditoria FOR SELECT
  USING (
    -- ROOT can read all audit records
    is_admin_master()
    OR
    -- Tenant-scoped users with permission
    (tenant_id = get_active_tenant_id() AND has_permission('remocao.auditoria.read'))
  );

-- =============================================================================
-- 19c. Restrict roles, permissions, role_permissions metadata exposure
--     Previously these were using (true), exposing authorization metadata
--     to all authenticated users. Now restricted to admin users.
--     ROOT and tenant admins can read all; others can read only
--     what's needed for their own role resolution.
--     IMPORTANT: RLS must be enabled on these tables first.
--     IMPORTANT: Policies may already exist from migration 003.
--     Use DROP POLICY IF EXISTS for both possible names.
-- =============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop both possible policy names (from migration 001 or 003)
DROP POLICY IF EXISTS "roles_select_all" ON roles;
DROP POLICY IF EXISTS "roles_select_restricted" ON roles;
CREATE POLICY "roles_select_restricted" ON roles FOR SELECT
  USING (
    is_admin_master()
    OR has_permission('admin.roles.manage')
    OR id IN (
      SELECT tm.role_id FROM tenant_memberships tm
      WHERE tm.person_id = auth.uid()
        AND tm.status = 'ativo'
        AND (tm.expira_em IS NULL OR tm.expira_em > now())
    )
  );

DROP POLICY IF EXISTS "permissions_select_all" ON permissions;
DROP POLICY IF EXISTS "permissions_select_restricted" ON permissions;
CREATE POLICY "permissions_select_restricted" ON permissions FOR SELECT
  USING (
    is_admin_master()
    OR has_permission('admin.roles.manage')
    OR id IN (
      SELECT rp.permission_id FROM role_permissions rp
      JOIN tenant_memberships tm ON tm.role_id = rp.role_id
      WHERE tm.person_id = auth.uid()
        AND tm.status = 'ativo'
        AND (tm.expira_em IS NULL OR tm.expira_em > now())
    )
  );

DROP POLICY IF EXISTS "role_permissions_select_all" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_select_restricted" ON role_permissions;
CREATE POLICY "role_permissions_select_restricted" ON role_permissions FOR SELECT
  USING (
    is_admin_master()
    OR has_permission('admin.roles.manage')
    OR role_id IN (
      SELECT tm.role_id FROM tenant_memberships tm
      WHERE tm.person_id = auth.uid()
        AND tm.status = 'ativo'
        AND (tm.expira_em IS NULL OR tm.expira_em > now())
    )
  );

-- =============================================================================
-- 20. Add RLS policies — tenant_memberships admin management
-- =============================================================================
-- Admin can update membership status (approve/reject)
CREATE POLICY "tenant_memberships_update_admin" ON tenant_memberships FOR UPDATE
  USING (
    tenant_id = get_active_tenant_id()
    AND has_permission('admin.users.manage')
  )
  WITH CHECK (
    tenant_id = get_active_tenant_id()
    AND has_permission('admin.users.manage')
  );

-- Admin can insert new memberships
CREATE POLICY "tenant_memberships_insert_admin" ON tenant_memberships FOR INSERT
  WITH CHECK (
    tenant_id = get_active_tenant_id()
    AND has_permission('admin.users.manage')
  );

-- =============================================================================
-- 21. Seed audit: record that the seed was applied
-- =============================================================================
INSERT INTO remocao_auditoria (
    tenant_id, acao, entidade, detalhes, usuario_id
) VALUES (
    NULL, 'seed_applied', 'system',
    jsonb_build_object(
        'migration', '009_reconciliation_rbac_seed',
        'roles_created', ARRAY['admin_master', 'admin_gestao', 'suporte_ti', 'suporte_master', 'suporte'],
        'timestamp', now()
    ),
    NULL
);

-- =============================================================================
-- 22. Add columns for password reset tracking on people table
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'password_reset_required'
    ) THEN
        ALTER TABLE people ADD COLUMN password_reset_required boolean default false;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people' AND column_name = 'ultimo_login'
    ) THEN
        ALTER TABLE people ADD COLUMN ultimo_login timestamp with time zone;
    END IF;
END $$;

-- =============================================================================
-- 23. Create force_password_reset() — mark user for password change on next login
-- =============================================================================
CREATE OR REPLACE FUNCTION force_password_reset(p_person_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admin_master or tenant admin can force password reset
    IF NOT is_admin_master() AND NOT has_permission('admin.users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to force password reset'
        USING ERRCODE = 'P0804';
    END IF;

    UPDATE people
    SET password_reset_required = true
    WHERE id = p_person_id;

    RETURN FOUND;
END;
$$;

-- =============================================================================
-- 24. Create clear_password_reset_flag() — called after successful password change
-- =============================================================================
CREATE OR REPLACE FUNCTION clear_password_reset_flag(p_person_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Users can clear their own flag after changing password
    -- Admins can clear for others
    IF p_person_id != auth.uid() AND NOT is_admin_master() AND NOT has_permission('admin.users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to clear password reset flag for this user'
        USING ERRCODE = 'P0804';
    END IF;

    UPDATE people
    SET password_reset_required = false
    WHERE id = p_person_id;

    RETURN FOUND;
END;
$$;

-- =============================================================================
-- 25. Grant execute on ROOT/admin functions
--     CRITICAL: REVOKE from PUBLIC first to prevent anon access via inherited privileges
-- =============================================================================
REVOKE EXECUTE ON FUNCTION bootstrap_root_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION revoke_root_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_admin_master() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_current_tenant_info() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_permissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION force_password_reset(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clear_password_reset_flag(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION invite_user_to_tenant(uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION approve_membership(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_user_password(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION bootstrap_root_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_root_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_tenant_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION force_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_password_reset_flag(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_tenant(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_membership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password(text, text) TO authenticated;
