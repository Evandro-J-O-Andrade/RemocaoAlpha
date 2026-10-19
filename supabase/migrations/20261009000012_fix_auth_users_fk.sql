-- =============================================================================
-- REMOCAO ALPHA -- Fix FK References from auth.users to tenants (012)
-- =============================================================================
-- Purpose:
--   The original migration 20261008000000 (archived) created lookup tables
--   with tenant_id referencing auth.users. Our consolidated model uses
--   tenants(id) as the canonical tenant table.
--   This migration safely converts the FKs without dropping tables.
-- IMPORTANT: PostgreSQL does NOT support "ADD CONSTRAINT IF NOT EXISTS" for
--   foreign keys. This migration uses a DO block to check the catalog first.
-- =============================================================================

-- =============================================================================
-- 1. Drop existing FKs that reference auth.users
--    Only operate on tables where the FK still points to auth.users
--    This step is unconditional — it runs regardless of tenants existence.
-- =============================================================================
DO $$
DECLARE
    tbl_name text;
    fk_name text;
BEGIN
    FOR tbl_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'remocao_tabela_referencia',
            'remocao_unidade',
            'remocao_setor'
          )
    LOOP
        -- Find and drop any FK on tenant_id that references auth.users
        FOR fk_name IN
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class tbl ON tbl.oid = con.conrelid
            JOIN pg_class ref ON ref.oid = con.confrelid
            WHERE tbl.relname = tbl_name
              AND con.contype = 'f'
              AND ref.relname = 'auth.users'
              AND con.conname LIKE '%tenant_id_fkey'
        LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl_name, fk_name);
            RAISE NOTICE 'Dropped FK % on %', fk_name, tbl_name;
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- 2. Add FKs referencing tenants(id)
--    ONLY if tenants table exists. If not, skip gracefully.
--    Uses catalog check instead of "ADD CONSTRAINT IF NOT EXISTS"
--    which PostgreSQL does not support for foreign keys.
-- =============================================================================
DO $$
DECLARE
    tbl_name text;
    v_exists boolean;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE NOTICE 'tenants table does not exist yet — FK conversion skipped';
        RETURN;
    END IF;

    FOR tbl_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'remocao_tabela_referencia',
            'remocao_unidade',
            'remocao_setor'
          )
    LOOP
        -- Check if FK to tenants already exists for this table
        v_exists := EXISTS (
            SELECT 1
            FROM pg_constraint con
            JOIN pg_class tbl ON tbl.oid = con.conrelid
            JOIN pg_class ref ON ref.oid = con.confrelid
            WHERE tbl.relname = tbl_name
              AND con.contype = 'f'
              AND ref.relname = 'tenants'
              AND con.conname = tbl_name || '_tenant_id_fkey'
        );

        IF NOT v_exists THEN
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id)',
                tbl_name, tbl_name
            );
            RAISE NOTICE 'Added FK %_tenant_id_fkey on %', tbl_name, tbl_name;
        ELSE
            RAISE NOTICE 'FK %_tenant_id_fkey already exists on %', tbl_name, tbl_name;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- 3. Verify no orphan records exist (data integrity check)
--    If any tenant_id in lookup tables does not exist in tenants,
--    this migration FAILS to prevent creating an inconsistent state.
--    The FK conversion is only safe when all tenant_ids are valid.
-- =============================================================================
DO $$
DECLARE
    v_orphan_count integer;
    v_orphan_details text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        SELECT COUNT(*) INTO v_orphan_count
        FROM (
            SELECT 'remocao_tabela_referencia' AS tbl, tenant_id FROM remocao_tabela_referencia
            UNION ALL
            SELECT 'remocao_unidade' AS tbl, tenant_id FROM remocao_unidade
            UNION ALL
            SELECT 'remocao_setor' AS tbl, tenant_id FROM remocao_setor
        ) t
        WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE tenants.id = t.tenant_id);

        IF v_orphan_count > 0 THEN
            SELECT string_agg(tbl || ':' || tenant_id::text, ', ')
            INTO v_orphan_details
            FROM (
                SELECT 'remocao_tabela_referencia' AS tbl, tenant_id FROM remocao_tabela_referencia
                UNION ALL
                SELECT 'remocao_unidade' AS tbl, tenant_id FROM remocao_unidade
                UNION ALL
                SELECT 'remocao_setor' AS tbl, tenant_id FROM remocao_setor
            ) t
            WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE tenants.id = t.tenant_id);

            RAISE EXCEPTION 'Cannot convert FKs: % orphan records found (tenant_id not in tenants): %',
                v_orphan_count, v_orphan_details
            USING ERRCODE = '23503';
        ELSE
            RAISE NOTICE 'No orphan records found — data integrity OK';
        END IF;
    END IF;
END $$;