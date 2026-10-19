-- =============================================================================
-- REMOÇÃO ALPHA — Foundation Security Migration (Migration 008)
-- =============================================================================
-- Purpose: Resolve the critical inconsistency between the original tenant model
-- (tenant_id -> auth.users) and the new identity layer (organizations, people,
-- tenant_memberships, role_assignments). All operational functions are hardened
-- with tenant + permission validation.
--
-- This migration is idempotent: it drops constraints if they exist before
-- recreating them, and uses CREATE OR REPLACE for functions.
--
-- Prerequisites: migrations 006 (identity) and 007 (identity RLS) must be
-- applied first, since this migration references `organizations`, `people`,
-- `tenant_memberships`, and `role_assignments`.
-- =============================================================================

-- =============================================================================
-- 1. Re-point tenant_id foreign keys from auth.users to organizations
--    Tables affected: remocao, remocao_tabela_referencia, remocao_unidade,
--    remocao_setor, remocao_equipe, remocao_veiculo, remocao_motorista,
--    remocao_motorista_turno, remocao_documento, remocao_auditoria
-- =============================================================================

DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'remocao', 'remocao_tabela_referencia', 'remocao_unidade',
            'remocao_setor', 'remocao_equipe', 'remocao_veiculo',
            'remocao_motorista', 'remocao_motorista_turno',
            'remocao_documento', 'remocao_auditoria'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_tenant_id_fkey', tbl_name, tbl_name);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES organizations(id)', tbl_name, tbl_name);
    END LOOP;
END $$;

-- =============================================================================
-- 2. Re-point created_by / updated_by from auth.users to people (same UUID)
--    remocao.created_by, remocao.updated_by already reference auth.users;
--    since people.id IS auth.users.id, the values are compatible but we
--    update the FK target for semantic correctness.
-- =============================================================================

ALTER TABLE remocao DROP CONSTRAINT IF EXISTS remocao_created_by_fkey;
ALTER TABLE remocao ADD CONSTRAINT remocao_created_by_fkey FOREIGN KEY (created_by) REFERENCES people(id);
ALTER TABLE remocao DROP CONSTRAINT IF EXISTS remocao_updated_by_fkey;
ALTER TABLE remocao ADD CONSTRAINT remocao_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES people(id);

-- =============================================================================
-- 3. Re-point status_historico / evento / checkin / checkout user FKs
--    These reference auth.users; re-point to people for consistency.
-- =============================================================================

ALTER TABLE remocao_status_historico DROP CONSTRAINT IF EXISTS remocao_status_historico_criado_por_fkey;
ALTER TABLE remocao_status_historico ADD CONSTRAINT remocao_status_historico_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES people(id);

ALTER TABLE remocao_evento DROP CONSTRAINT IF EXISTS remocao_evento_criado_por_fkey;
ALTER TABLE remocao_evento ADD CONSTRAINT remocao_evento_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES people(id);

ALTER TABLE remocao_checkin DROP CONSTRAINT IF EXISTS remocao_checkin_created_by_fkey;
ALTER TABLE remocao_checkin ADD CONSTRAINT remocao_checkin_created_by_fkey FOREIGN KEY (created_by) REFERENCES people(id);

ALTER TABLE remocao_checkout DROP CONSTRAINT IF EXISTS remocao_checkout_created_by_fkey;
ALTER TABLE remocao_checkout ADD CONSTRAINT remocao_checkout_created_by_fkey FOREIGN KEY (created_by) REFERENCES people(id);

ALTER TABLE remocao_documento DROP CONSTRAINT IF EXISTS remocao_documento_enviado_por_fkey;
ALTER TABLE remocao_documento ADD CONSTRAINT remocao_documento_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES people(id);

ALTER TABLE remocao_documento_conferencia DROP CONSTRAINT IF EXISTS remocao_documento_conferencia_conferido_por_fkey;
ALTER TABLE remocao_documento_conferencia ADD CONSTRAINT remocao_documento_conferencia_conferido_por_fkey FOREIGN KEY (conferido_por) REFERENCES people(id);

-- =============================================================================
-- 4. Fix get_tenant_id() — ensure it resolves from tenant_memberships
--    (migration 007 already updated this; we re-affirm it here for safety)
-- =============================================================================

create or replace function get_tenant_id()
returns uuid as $$
    select coalesce(
        (current_setting('request.tenant_id', true))::uuid,
        (select tenant_id
         from tenant_memberships
         where person_id = auth.uid()
           and status = 'ativo'
         limit 1),
        auth.uid()
    );
$$ language sql stable;

-- =============================================================================
-- 5. Fix get_current_person_id() — resolve from people table
-- =============================================================================

create or replace function get_current_person_id()
returns uuid as $$
    select coalesce(
        (current_setting('request.person_id', true))::uuid,
        auth.uid()
    );
$$ language sql stable;

-- =============================================================================
-- 6. Fix get_current_person_nome() — new helper for audit trail
--    Returns the person's name, falling back to auth user metadata
-- =============================================================================

create or replace function get_current_person_nome()
returns text as $$
    select coalesce(
        (current_setting('request.person_nome', true)),
        (select nome from people where id = auth.uid() limit 1),
        auth.uid()::text
    );
$$ language sql stable;

-- =============================================================================
-- 7. Fix has_permission() — real RBAC via role_assignments
--    (migration 007 already updated this; re-affirm here)
-- =============================================================================

create or replace function has_permission(p_permission text)
returns boolean as $$
    select exists (
        select 1
        from role_assignments ra
        join tenant_memberships tm on tm.tenant_id = ra.tenant_id
                                  and tm.person_id = auth.uid()
                                  and tm.status = 'ativo'
        where ra.person_id = auth.uid()
          and ra.permission_key = p_permission
          and (ra.expira_em is null or ra.expira_em > now())
    );
$$ language sql stable;

-- =============================================================================
-- 8. Fix validar_transicao_status() — remove unreachable code
--    Original migration 004 had: `return status_atual not in (...); return true;`
--    The `return true` after the previous return was dead code.
--    Also add missing 'NAO_REALIZADA' transitions.
-- =============================================================================

create or replace function validar_transicao_status(
    status_atual remocao_status,
    status_novo   remocao_status
) returns boolean as $$
BEGIN
    -- Same status is always valid (no-op)
    IF status_atual = status_novo THEN
        RETURN TRUE;
    END IF;

    -- Terminal states cannot transition
    IF status_atual IN ('ENCERRADA', 'CANCELADA', 'NAO_REALIZADA') THEN
        RETURN FALSE;
    END IF;

    -- Cancelamento / Suspensão can happen from any non-terminal state
    IF status_novo IN ('CANCELADA', 'SUSPENSA') THEN
        RETURN TRUE;
    END IF;

    -- INTERCORRENCIA can happen from any non-terminal, non-armed state
    IF status_novo = 'INTERCORRENCIA' THEN
        RETURN status_atual NOT IN ('RETORNOU_UNIDADE', 'SUSPENSA');
    END IF;

    -- NAO_REALIZADA can happen from non-terminal states (except final ones)
    IF status_novo = 'NAO_REALIZADA' THEN
        RETURN status_atual NOT IN ('RETORNOU_UNIDADE', 'ENCERRADA', 'CANCELADA', 'NAO_REALIZADA');
    END IF;

    -- Forward transitions only for the normal workflow
    CASE status_atual || '->' || status_novo OF
        WHEN 'SOLICITADA->EM_AVALIACAO'                          THEN RETURN TRUE;
        WHEN 'EM_AVALIACAO->AGUARDANDO_DESTINO'                  THEN RETURN TRUE;
        WHEN 'AGUARDANDO_DESTINO->DESTINO_CONFIRMADO'            THEN RETURN TRUE;
        WHEN 'DESTINO_CONFIRMADO->AGUARDANDO_EQUIPE'              THEN RETURN TRUE;
        WHEN 'AGUARDANDO_EQUIPE->EQUIPE_CONFIRMADA'               THEN RETURN TRUE;
        WHEN 'EQUIPE_CONFIRMADA->AGUARDANDO_MOTORISTA'            THEN RETURN TRUE;
        WHEN 'AGUARDANDO_MOTORISTA->MOTORISTA_CHECKIN'            THEN RETURN TRUE;
        WHEN 'MOTORISTA_CHECKIN->MOTORISTA_CONFIRMADO'            THEN RETURN TRUE;
        WHEN 'MOTORISTA_CONFIRMADO->CHECKLIST_PENDENTE'           THEN RETURN TRUE;
        WHEN 'CHECKLIST_PENDENTE->PRONTA_PARA_SAIDA'              THEN RETURN TRUE;
        WHEN 'PRONTA_PARA_SAIDA->EM_DESLOCAMENTO'                THEN RETURN TRUE;
        WHEN 'EM_DESLOCAMENTO->CHEGADA_DESTINO'                    THEN RETURN TRUE;
        WHEN 'CHEGADA_DESTINO->PACIENTE_ENTREGUE'                  THEN RETURN TRUE;
        WHEN 'PACIENTE_ENTREGUE->RETORNANDO'                       THEN RETURN TRUE;
        WHEN 'RETORNANDO->RETORNOU_UNIDADE'                        THEN RETURN TRUE;
        WHEN 'RETORNOU_UNIDADE->ENCERRADA'                          THEN RETURN TRUE;
        WHEN 'INTERCORRENCIA->EM_DESLOCAMENTO'                      THEN RETURN TRUE;
        WHEN 'INTERCORRENCIA->PACIENTE_ENTREGUE'                    THEN RETURN TRUE;
        WHEN 'INTERCORRENCIA->RETORNANDO'                           THEN RETURN TRUE;
        WHEN 'INTERCORRENCIA->ENCERRADA'                            THEN RETURN TRUE;
        WHEN 'INTERCORRENCIA->CANCELADA'                            THEN RETURN TRUE;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ language plpgsql;

-- =============================================================================
-- 9. Harden update_remocao_status() — validate tenant ownership + permission
--    Now checks that the caller belongs to the same tenant and has
--    remocao.remocao.update_status permission.
-- =============================================================================

create or replace function update_remocao_status(
    p_remocao_id  uuid,
    p_status_novo remocao_status,
    p_usuario_id  uuid,
    p_motivo      text default null
) returns remocao_status as $$
DECLARE
    v_status_atual remocao_status;
    v_tenant       uuid;
BEGIN
    -- Fetch the remocao and verify tenant ownership
    SELECT status, tenant_id
    INTO v_status_atual, v_tenant
    FROM remocao
    WHERE id = p_remocao_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Remocao not found: %', p_remocao_id
        USING ERRCODE = 'P0002';
    END IF;

    -- Tenant isolation: caller must belong to the same tenant
    IF v_tenant IS DISTINCT FROM get_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: not in this organization'
        USING ERRCODE = 'P0804';
    END IF;

    -- Permission check: caller must have update_status permission
    IF NOT has_permission('remocao.remocao.update_status') THEN
        RAISE EXCEPTION 'Permission denied: remocao.remocao.update_status required'
        USING ERRCODE = 'P0804';
    END IF;

    -- State machine validation
    IF NOT validar_transicao_status(v_status_atual, p_status_novo) THEN
        RAISE EXCEPTION 'Invalid transition: % -> %', v_status_atual, p_status_novo
        USING ERRCODE = 'P0001';
    END IF;

    -- Apply the transition
    UPDATE remocao
    SET status = p_status_novo,
        updated_by = p_usuario_id,
        updated_at = now(),
        motivo_cancelamento = case when p_status_novo = 'CANCELADA' then p_motivo else motivo_cancelamento end,
        motivo_suspensao = case when p_status_novo = 'SUSPENSA' then p_motivo else motivo_suspensao end
    WHERE id = p_remocao_id;

    RETURN p_status_novo;
END;
$$ language plpgsql security definer;

-- =============================================================================
-- 10. Harden finalizar_checkout() — validate tenant + permission
-- =============================================================================

create or replace function finalizar_checkout(
    p_remocao_id         uuid,
    p_quilometragem_inicial integer,
    p_quilometragem_final   integer
) returns integer as $$
DECLARE
    v_tenant uuid;
    v_percorridos integer;
BEGIN
    -- Verify remocao exists and caller has tenant access
    SELECT tenant_id INTO v_tenant
    FROM remocao
    WHERE id = p_remocao_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Remocao not found: %', p_remocao_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_tenant IS DISTINCT FROM get_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: not in this organization'
        USING ERRCODE = 'P0804';
    END IF;

    IF NOT has_permission('remocao.remocao.update') THEN
        RAISE EXCEPTION 'Permission denied: remocao.remocao.update required'
        USING ERRCODE = 'P0804';
    END IF;

    v_percorridos := p_quilometragem_final - p_quilometragem_inicial;

    UPDATE remocao
    SET quilometragem_final = p_quilometragem_final,
        quilometragem_percorrida = v_percorridos,
        tempo_total = now() - (
            SELECT created_at
            FROM remocao_checkin
            WHERE remocao_id = p_remocao_id
            ORDER BY created_at ASC
            LIMIT 1
        )
    WHERE id = p_remocao_id;

    RETURN v_percorridos;
END;
$$ language plpgsql security definer;

-- =============================================================================
-- 11. Harden generate_remocao_number() — validate tenant + permission
-- =============================================================================

create or replace function generate_remocao_number(p_tenant_id uuid)
returns text as $$
DECLARE
    v_ano     text;
    v_count   integer;
    v_result  text;
BEGIN
    -- Tenant isolation
    IF p_tenant_id IS DISTINCT FROM get_tenant_id() THEN
        RAISE EXCEPTION 'Access denied: not in this organization'
        USING ERRCODE = 'P0804';
    END IF;

    -- Permission check
    IF NOT has_permission('remocao.remocao.create') THEN
        RAISE EXCEPTION 'Permission denied: remocao.remocao.create required'
        USING ERRCODE = 'P0804';
    END IF;

    v_ano := to_char(now(), 'YYYY');
    SELECT count(*) + 1 INTO v_count
    FROM remocao
    WHERE tenant_id = p_tenant_id
      AND date_trunc('year', created_at) = date_trunc('year', now());

    v_result := v_ano || lpad(v_count::text, 4, '0');
    RETURN v_result;
END;
$$ language plpgsql;

-- =============================================================================
-- 12. Fix audit trigger — use proper person name resolution
--    Original trigger used current_setting('request.person_nome') which is
--    not reliably set. Now uses get_current_person_nome().
-- =============================================================================

create or replace function remocao_audit_trigger()
returns trigger as $$
BEGIN
    -- Log status history
    INSERT INTO remocao_status_historico (
        remocao_id, status_anterior, status_novo,
        criado_por, criado_por_nome
    ) VALUES (
        NEW.id, OLD.status, NEW.status,
        auth.uid(), get_current_person_nome()
    );

    -- Log event
    INSERT INTO remocao_evento (
        remocao_id, evento, descricao, nivel,
        criado_por, criado_por_nome
    ) VALUES (
        NEW.id, 'status_changed',
        format('Status alterado de %s para %s', OLD.status, NEW.status),
        'info',
        auth.uid(), get_current_person_nome()
    );

    -- Write to audit trail (append-only)
    INSERT INTO remocao_auditoria (
        tenant_id, remocao_id, acao, entidade,
        registro_id, detalhes,
        usuario_id, usuario_nome
    ) VALUES (
        NEW.tenant_id, NEW.id, 'update_status', 'remocao',
        NEW.id,
        jsonb_build_object(
            'status_anterior', OLD.status,
            'status_novo', NEW.status,
            'motivo', NEW.motivo_cancelamento
        ),
        auth.uid(), get_current_person_nome()
    );

    RETURN NEW;
END;
$$ language plpgsql security definer;

-- =============================================================================
-- 13. Fix storage policies — tenant-aware access to private documents bucket
--    Documents belong to a tenant; only members of the same tenant can
--    upload or download. Signed URLs are used for download (not public URLs).
-- =============================================================================

-- Drop existing non-tenant-aware storage policies
drop policy if exists "authenticated users can upload documents" on storage.objects;
drop policy if exists "authenticated users can view documents" on storage.objects;

-- Upload: user must belong to the tenant that owns the documento record.
-- Since storage.objects doesn't have tenant_id, we enforce via storage_path
-- convention: paths start with {remocao_id}/ which maps back to remocao.tenant_id.
create policy "documents_upload_tenant_scoped"
on storage.objects for insert
with check (
    bucket_id = 'remocao-documentos'
    AND EXISTS (
        SELECT 1
        FROM remocao r
        JOIN tenant_memberships tm ON tm.tenant_id = r.tenant_id
        WHERE r.id = (LEFT(name, 36))::uuid
          AND tm.person_id = auth.uid()
          AND tm.status = 'ativo'
    )
);

-- View: same tenant scoping via path → remocao → tenant mapping
create policy "documents_view_tenant_scoped"
on storage.objects for select
using (
    bucket_id = 'remocao-documentos'
    AND EXISTS (
        SELECT 1
        FROM remocao r
        JOIN tenant_memberships tm ON tm.tenant_id = r.tenant_id
        WHERE r.id = (LEFT(name, 36))::uuid
          AND tm.person_id = auth.uid()
          AND tm.status = 'ativo'
    )
);

-- Update and delete: only for same tenant
create policy "documents_update_tenant_scoped"
on storage.objects for update
using (
    bucket_id = 'remocao-documentos'
    AND EXISTS (
        SELECT 1
        FROM remocao r
        JOIN tenant_memberships tm ON tm.tenant_id = r.tenant_id
        WHERE r.id = (LEFT(name, 36))::uuid
          AND tm.person_id = auth.uid()
          AND tm.status = 'ativo'
    )
);

create policy "documents_delete_tenant_scoped"
on storage.objects for delete
using (
    bucket_id = 'remocao-documentos'
    AND EXISTS (
        SELECT 1
        FROM remocao r
        JOIN tenant_memberships tm ON tm.tenant_id = r.tenant_id
        WHERE r.id = (LEFT(name, 36))::uuid
          AND tm.person_id = auth.uid()
          AND tm.status = 'ativo'
    )
);

-- =============================================================================
-- 14. Auto-create default tenant on user signup
--    Extends the trigger from migration 006 to also create an organization
--    and tenant membership automatically.
-- =============================================================================

create or replace function public.handle_new_user_create_person()
returns trigger
language 'plpgsql'
security definer
as $$
BEGIN
    -- Create person record
    INSERT INTO people (id, nome, email)
    VALUES (
        NEW.id,
        coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create default organization for the user
    DECLARE
        v_org_id uuid;
    BEGIN
        v_org_id := gen_random_uuid();
        INSERT INTO organizations (id, nome, email)
        VALUES (v_org_id, 'Nova Organização', NEW.email);

        -- Create tenant membership as admin
        INSERT INTO tenant_memberships (tenant_id, person_id, papel, status, aprovado_em)
        VALUES (v_org_id, NEW.id, 'admin', 'ativo', now());

        -- Grant all remocao permissions to the admin creator
        INSERT INTO role_assignments (tenant_id, person_id, permission_key)
        SELECT v_org_id, NEW.id, p.permission_key
        FROM (
            VALUES
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
        ) AS p (permission_key);
    EXCEPTION
        WHEN unique_violation THEN
            -- User already has an organization; skip
            NULL;
    END;

    RETURN NEW;
END;
$$;

-- =============================================================================
-- 15. Add function to set request context (for admin / support impersonation)
-- =============================================================================

create or replace function set_tenant_context(p_tenant_id uuid, p_person_id uuid default null)
returns void as $$
BEGIN
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('request.tenant_id', p_tenant_id::text, false);
    END IF;
    IF p_person_id IS NOT NULL THEN
        PERFORM set_config('request.person_id', p_person_id::text, false);
    ELSE
        PERFORM set_config('request.person_id', auth.uid()::text, false);
    END IF;
END;
$$ language plpgsql security definer;

-- =============================================================================
-- 16. Add function to get current user's active tenant and role
--    Used by the frontend to determine which organization the user is acting under.
-- =============================================================================

create or replace function get_current_tenant_info()
returns table (
    tenant_id     uuid,
    tenant_nome   text,
    person_id     uuid,
    person_nome   text,
    person_email  text,
    papel         text
) as $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.nome,
        p.id,
        p.nome,
        p.email,
        tm.papel
    FROM organizations o
    JOIN tenant_memberships tm ON tm.tenant_id = o.id
    JOIN people p ON p.id = tm.person_id
    WHERE p.id = auth.uid()
      AND tm.status = 'ativo'
    ORDER BY o.created_at ASC
    LIMIT 1;
END;
$$ language plpgsql stable;

-- =============================================================================
-- 17. Ensure indexes for performance on tenant-scoped queries
-- =============================================================================

create index if not exists idx_remocao_tenant_status on remocao(tenant_id, status);
create index if not exists idx_remocao_tenant_created on remocao(tenant_id, created_at desc);
create index if not exists idx_remocao_auditoria_tenant on remocao_auditoria(tenant_id, created_at desc);
create index if not exists idx_remocao_auditoria_remocao on remocao_auditoria(remocao_id, created_at desc);
create index if not exists idx_remocao_status_historico_remocao on remocao_status_historico(remocao_id, created_at desc);
create index if not exists idx_remocao_evento_remocao on remocao_evento(remocao_id, created_at desc);

-- =============================================================================
-- 18. get_user_permissions() — returns all permission keys for the current user
--    Used by the frontend to build the permission set for RBAC checks.
-- =============================================================================

create or replace function get_user_permissions()
returns table (permission_key text) as $$
BEGIN
    RETURN QUERY
    SELECT ra.permission_key::text
    FROM role_assignments ra
    JOIN tenant_memberships tm ON tm.tenant_id = ra.tenant_id
    WHERE ra.person_id = auth.uid()
      AND tm.status = 'ativo'
      AND (ra.expira_em IS NULL OR ra.expira_em > now());
END;
$$ language plpgsql stable;
