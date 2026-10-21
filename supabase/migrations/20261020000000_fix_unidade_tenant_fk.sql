-- Migration: corrigir FK de remocao_unidade.tenant_id para referenciar tenants(id)
-- Data: 2026-10-20
-- Autor: Kilo
-- Status: DRAFT — exige autorização explícita antes de aplicar no banco remoto.
--
-- Contexto:
-- A migration arquivada 20261008000000_remocao_enums.sql criou
-- remocao_unidade.tenant_id com FK para auth.users. A migration vigente
-- 20261009000004_remocao_enums.sql já declara references tenants(id), mas bases
-- instaladas a partir da versão arquivada mantêm a FK antiga. Esta migration
-- corrige apenas o banco já implantado, de forma idempotente e sem apagar dados.
--
-- Observação: a migration 20261009000012_fix_auth_users_fk.sql já faz a mesma
-- correção de forma genérica (loop sobre várias tabelas). Esta permanece como
-- reparo cirúrgico e verificável caso a anterior não tenha sido aplicada.

DO $$
DECLARE
  v_orphan_count integer;
  v_orphan_details text;
  v_fk_name text;
  v_fk_target text;
BEGIN
  -- 1. Verificar registros incompatíveis (tenant_id sem tenant correspondente).
  SELECT count(*), string_agg(DISTINCT ru.tenant_id::text, ', ')
  INTO v_orphan_count, v_orphan_details
  FROM public.remocao_unidade ru
  LEFT JOIN public.tenants t ON t.id = ru.tenant_id
  WHERE t.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION
      'remocao_unidade possui % registro(s) com tenant_id fora da tabela tenants: %',
      v_orphan_count, v_orphan_details
      USING ERRCODE = '23503',
            HINT = 'Reconcilie ou desative as unidades órfãs antes de reaplicar esta migration.';
  END IF;

  -- 2. Identificar a FK da coluna tenant_id (qualquer que seja o nome) e a
  --    tabela referenciada (nome qualificado).
  SELECT con.conname, ref.oid::regclass::text
  INTO v_fk_name, v_fk_target
  FROM pg_constraint con
  JOIN pg_class ref ON ref.oid = con.confrelid
  WHERE con.contype = 'f'
    AND con.conrelid = 'public.remocao_unidade'::regclass
    AND con.conkey = ARRAY[(
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'public.remocao_unidade'::regclass
        AND attname = 'tenant_id'
      AND NOT attisdropped
    )]::smallint[];

  -- 3. Remover a FK quando ela ainda não aponta para tenants.
  IF v_fk_name IS NOT NULL AND v_fk_target <> 'public.tenants' THEN
    EXECUTE format('ALTER TABLE public.remocao_unidade DROP CONSTRAINT %I', v_fk_name);
  END IF;

  -- 4. Recriar a FK para tenants(id) apenas quando ela não existir.
  IF v_fk_target IS DISTINCT FROM 'public.tenants' THEN
    ALTER TABLE public.remocao_unidade
      ADD CONSTRAINT remocao_unidade_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenants(id);
  END IF;

  RAISE NOTICE 'remocao_unidade.tenant_id: FK % -> %',
    COALESCE(v_fk_name, 'nenhuma'), COALESCE(v_fk_target, 'nenhuma');
END $$;
