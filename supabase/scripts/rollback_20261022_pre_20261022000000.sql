-- =============================================================================
-- Backup / rollback — estado do banco ANTES da migration 20261022000000
-- Gerado em: 2026-10-21T22:57:46.350Z
-- Projeto: jqamhriokskinifjybfc (newwaveremocaoalpha)
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <este arquivo>
--
-- Restaura as definicoes originais das funcoes alteradas e remove os
-- objetos novos criados pela migration (active_tenant_sessions, safe_uuid).
-- =============================================================================

BEGIN;

-- ---- objetos novos a remover ----
DROP TABLE IF EXISTS public.active_tenant_sessions;
DROP FUNCTION IF EXISTS public.safe_uuid(text);

-- ---- definicoes originais das funcoes alteradas ----
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_active_tenant(p_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_tenant_info()
 RETURNS TABLE(tenant_id uuid, tenant_nome text, person_id uuid, person_nome text, person_email text, papel text, is_root boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_tenant()
 RETURNS tenants
 LANGUAGE sql
 STABLE
AS $function$
  select * from tenants where id = get_active_tenant_id();
$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    (select 1 from root_privileges rp where rp.person_id = auth.uid() and rp.revoked_at is null)
    union all
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
 RETURNS TABLE(permission_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;

-- ---- copia dos dados de autorizacao (para conferencia) ----
select * from root_privileges order by granted_at;
-- registros atuais: [{"t":"root_privileges","id":"58f37c2b-fac4-49dc-8d1a-0d6130af0d4b","person_id":"7766caa1-002e-4f72-83b8-fd1e5933fb0c","granted_by":null,"granted_at":"2026-10-19T14:13:49.779Z","revoked_at":null,"revoked_by":null,"motivo":null},{"t":"root_privileges","id":"9ae0b876-5f67-4f49-85d5-3b2be2e2cebd","person_id":"1c1171b6-f117-484a-8c1a-a76da85597dd","granted_by":"1c1171b6-f117-484a-8c1a-a76da85597dd","granted_at":"2026-10-20T00:24:53.511Z","revoked_at":null,"revoked_by":null,"motivo":null},{"t":"root_privileges","id":"d3f1f0b6-7d01-4932-ab67-54c5ea277d51","person_id":"63d9ea5b-4a09-49e4-af70-43a8f262d3da","granted_by":"63d9ea5b-4a09-49e4-af70-43a8f262d3da","granted_at":"2026-10-20T02:58:54.567Z","revoked_at":null,"revoked_by":null,"motivo":null}]

select * from tenant_memberships order by created_at;
-- registros atuais: [{"id":"d3873e9c-c96c-46b5-9629-b47277fc6003","tenant_id":"00000000-0000-0000-0000-000000000001","person_id":"1c1171b6-f117-484a-8c1a-a76da85597dd","role_id":"c9ea98fd-e716-4e1a-9fe7-318a25869b6f","status":"ativo","papel":"admin","aprovado_em":"2026-10-20T00:24:07.551Z","expira_em":null,"is_root":false},{"id":"78d71891-a92d-4dde-a3af-e3bdd73b7abc","tenant_id":"00000000-0000-0000-0000-000000000001","person_id":"63d9ea5b-4a09-49e4-af70-43a8f262d3da","role_id":"d6cb5b67-8ef0-437d-a0ca-e6f7d7414be3","status":"ativo","papel":"admin_master","aprovado_em":"2026-10-20T02:58:54.457Z","expira_em":null,"is_root":false}]

COMMIT;
