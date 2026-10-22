-- =============================================================================
-- Script de impacto — Reconciliacao de autorizacoes (RemocaoAlpha)
-- Data: 2026-10-22
-- Autor: Kilo
-- Alvo: projeto Supabase jqamhriokskinifjybfc (newwaveremocaoalpha)
-- Status: RASCUNHO PARA REVISAO — NAO APLICADO.
--
-- Este arquivo fica em supabase/scripts/ e NAO em supabase/migrations/ de
-- proposito: o runner do Supabase CLI so aplica migrations. Este script altera
-- DADOS de autorizacao e exige revisao humana antes de rodar.
--
-- Decisao vigente (aprovada na revisao):
--   - ROOT global fica exclusivamente com Evandro Andrade
--     (evandro_j.o.a@hotmail.com).
--   - dev@remocaoalpha.local perde ROOT e mantem o vinculo tenant-scoped
--     admin_gestao que ja possui.
--   - mewwavegestaoalpha@hotmail.com perde ROOT. Como nao possui nenhum
--     vinculo em tenant_memberships, ficaria sem acesso algum; o bloco B cria
--     um vinculo admin_gestao para preservar o acesso operacional sem poder
--     global.
--
-- O tenant 00000000-0000-0000-0000-000000000001 e legitimo e nao e alterado.
--
-- Como executar (recomendado):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/reconciliacao_autorizacoes_20261022.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- 0. Contexto de execucao
-- =============================================================================
-- As funcoes de ROOT (revoke_root_user) exigem que o chamador seja admin_master
-- e usam auth.uid(). Executando direto pelo psql, auth.uid() seria NULL e a
-- revogacao seria negada. Reproduzimos a sessao do ROOT administrador
-- (Evandro Andrade) para que a operacao passe pelo mecanismo oficial, com
-- trilha de auditoria.

DO $$
DECLARE
  v_root_email constant text := 'evandro_j.o.a@hotmail.com';
  v_root_person_id uuid;
BEGIN
  SELECT id INTO v_root_person_id FROM people WHERE email = v_root_email;
  IF v_root_person_id IS NULL THEN
    RAISE EXCEPTION 'ABORT: conta ROOT de referencia (%) nao encontrada em people', v_root_email;
  END IF;
  PERFORM set_config('request.jwt.claim.sub', v_root_person_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_root_person_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.email', v_root_email, true);
  RAISE NOTICE 'Contexto de execucao: ROOT administrador % (%)', v_root_email, v_root_person_id;
END $$;

-- =============================================================================
-- 1. DIAGNOSTICO E PRE-CONDICOES
-- =============================================================================

\echo '--- 1.1 Estado atual de root_privileges ---'
SELECT p.id, p.nome AS pessoa, p.email, rp.granted_by, gp.email AS concedido_por,
       rp.granted_at, rp.revoked_at, rp.motivo
FROM root_privileges rp
JOIN people p ON p.id = rp.person_id
LEFT JOIN people gp ON gp.id = rp.granted_by
ORDER BY rp.granted_at;

\echo '--- 1.2 Estado atual de tenant_memberships ---'
SELECT tm.id, p.nome AS pessoa, p.email, t.nome AS tenant, tm.tenant_id,
       r.key AS role_key, tm.papel, tm.status, tm.aprovado_em, tm.expira_em, tm.is_root
FROM tenant_memberships tm
JOIN people p ON p.id = tm.person_id
JOIN tenants t ON t.id = tm.tenant_id
LEFT JOIN roles r ON r.id = tm.role_id
ORDER BY tm.created_at;

\echo '--- 1.3 Autorizacao efetiva por conta (equivalente a is_admin_master + get_user_permissions) ---'
SELECT p.email,
       exists (
         select 1 from root_privileges rp
         where rp.person_id = p.id and rp.revoked_at is null
       ) AS root_efetivo,
       case
         when exists (
           select 1 from root_privileges rp
           where rp.person_id = p.id and rp.revoked_at is null
         ) then (select count(*) from permissions)
         else (
           select count(distinct pr.id)
           from permissions pr
           join role_permissions rp on rp.permission_id = pr.id
           join tenant_memberships tm on tm.role_id = rp.role_id
           where tm.person_id = p.id
             and tm.status = 'ativo'
             and tm.tenant_id = '00000000-0000-0000-0000-000000000001'
             and (tm.expira_em is null or tm.expira_em > now())
         )
       end AS total_permissoes
FROM people p
ORDER BY p.email;

\echo '--- 1.3b tenant_memberships.is_root nao participa do mecanismo de autorizacao ---'
-- A coluna existe, mas nenhuma funcao, policy ou view a le: o mecanismo efetivo
-- de ROOT e exclusivamente root_privileges. Por isso nao se escreve is_root=true
-- em memberships — isso nao produziria efeito nenhum.
SELECT count(*) AS memberships_com_is_root_true FROM tenant_memberships WHERE is_root;

\echo '--- 1.4 Dependencias do tenant e das unidades ---'
SELECT t.id, t.nome, t.ativo,
       (SELECT count(*) FROM remocao_unidade ru WHERE ru.tenant_id = t.id) AS unidades,
       (SELECT count(*) FROM tenant_memberships tm WHERE tm.tenant_id = t.id) AS vinculos,
       (SELECT count(*) FROM remocao r WHERE r.tenant_id = t.id) AS remocoes
FROM tenants t ORDER BY t.nome;

DO $$
DECLARE
  v_total_root integer;
  v_roots_ativos integer;
  v_evandro uuid;
  v_dev uuid;
  v_root_admin uuid;
  v_role_admin_gestao uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- 1.5 PRE-CONDICOES (qualquer divergencia aborta antes de tocar em dados)

  SELECT count(*) INTO v_total_root FROM root_privileges;
  SELECT count(*) INTO v_roots_ativos FROM root_privileges WHERE revoked_at IS NULL;

  IF v_total_root <> 3 THEN
    RAISE EXCEPTION 'ABORT: esperado exatamente 3 linhas em root_privileges, encontrado %', v_total_root;
  END IF;
  IF v_roots_ativos <> 3 THEN
    RAISE EXCEPTION 'ABORT: esperado 3 ROOTs ativos, encontrado %', v_roots_ativos;
  END IF;

  SELECT id INTO v_evandro FROM people WHERE email = 'evandro_j.o.a@hotmail.com';
  SELECT id INTO v_dev FROM people WHERE email = 'dev@remocaoalpha.local';
  SELECT id INTO v_root_admin FROM people WHERE email = 'mewwavegestaoalpha@hotmail.com';

  IF v_evandro IS NULL OR v_dev IS NULL OR v_root_admin IS NULL THEN
    RAISE EXCEPTION 'ABORT: uma das contas esperadas nao existe em people (evandro=% dev=% root_admin=%)',
      v_evandro, v_dev, v_root_admin;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_evandro AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: a conta ROOT de referencia (evandro_j.o.a@hotmail.com) nao esta com ROOT ativo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_dev AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: dev@remocaoalpha.local nao esta com ROOT ativo — estado diferente do esperado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_root_admin AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: mewwavegestaoalpha@hotmail.com nao esta com ROOT ativo — estado diferente do esperado';
  END IF;

  -- O vinculo de dev@remocaoalpha.local precisa existir para sobreviver a revogacao
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships tm
    WHERE tm.person_id = v_dev AND tm.tenant_id = v_tenant AND tm.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'ABORT: dev@remocaoalpha.local nao possui vinculo ativo no tenant — a revogacao de ROOT o deixaria sem acesso';
  END IF;

  SELECT id INTO v_role_admin_gestao FROM roles WHERE key = 'admin_gestao';
  IF v_role_admin_gestao IS NULL THEN
    RAISE EXCEPTION 'ABORT: role admin_gestao nao existe — o bloco B nao pode criar vinculo tenant-scoped';
  END IF;

  RAISE NOTICE 'Pre-condicoes OK: 3 ROOTs ativos, contas e roles confirmados.';
END $$;

-- =============================================================================
-- 2. LISTA EXPLICITA DE USUARIOS E REGISTROS AFETADOS
-- =============================================================================

\echo '--- 2.1 Registros que serao alterados ---'
SELECT 'root_privileges' AS tabela, rp.id, p.email AS conta, 'revoked_at sera preenchido' AS alteracao
FROM root_privileges rp JOIN people p ON p.id = rp.person_id
WHERE rp.revoked_at IS NULL AND rp.person_id IN (
  (SELECT id FROM people WHERE email IN ('dev@remocaoalpha.local', 'mewwavegestaoalpha@hotmail.com'))
)
UNION ALL
SELECT 'tenant_memberships', tm.id, p.email,
       CASE WHEN tm.person_id = (SELECT id FROM people WHERE email = 'mewwavegestaoalpha@hotmail.com')
            THEN 'novo vinculo admin_gestao (bloque B)' ELSE 'nenhuma alteracao' END
FROM tenant_memberships tm JOIN people p ON p.id = tm.person_id
ORDER BY tabela, id;

-- =============================================================================
-- 3. CORRECOES TRANSACIONAIS
-- =============================================================================

\echo '--- 3.1 Revogando ROOT das contas nao autorizadas ---'
-- revoke_root_user() e o mecanismo oficial: exige admin_master, preenche
-- revoked_at/revoked_by e grava auditoria em remocao_auditoria.
SELECT public.revoke_root_user('dev@remocaoalpha.local') AS revogado_dev;
SELECT public.revoke_root_user('mewwavegestaoalpha@hotmail.com') AS revogado_root_admin;

\echo '--- 3.2 Bloco B (condicional): vinculo tenant-scoped para a conta sem vinculo ---'
-- Sem este passo, mewwavegestaoalpha@hotmail.com fica sem ROOT e sem membership,
-- portanto sem nenhum acesso ao sistema. O vinculo e admin_gestao no mesmo
-- tenant, com o mesmo papel que dev@remocaoalpha.local ja possui.
DO $$
DECLARE
  v_garantir_acesso_operacional constant boolean := true;
  v_email constant text := 'mewwavegestaoalpha@hotmail.com';
  v_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
  v_person uuid;
  v_role uuid;
BEGIN
  IF NOT v_garantir_acesso_operacional THEN
    RAISE NOTICE 'Bloco B desativado: a conta % ficara sem nenhum vinculo.', v_email;
    RETURN;
  END IF;

  SELECT id INTO v_person FROM people WHERE email = v_email;
  SELECT id INTO v_role FROM roles WHERE key = 'admin_gestao';

  IF EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE tenant_id = v_tenant AND person_id = v_person
  ) THEN
    RAISE NOTICE 'Bloco B: vinculo ja existe para % — nada a fazer.', v_email;
    RETURN;
  END IF;

  INSERT INTO tenant_memberships (
    tenant_id, person_id, role_id, status, papel, aprovado_em, created_at, updated_at
  ) VALUES (
    v_tenant, v_person, v_role, 'ativo', 'admin', now(), now(), now()
  );
  -- papel segue o padrao do vinculo admin_gestao ja existente
  -- (dev@remocaoalpha.local). O papel efetivo vem de role_id, nao desta coluna.

  RAISE NOTICE 'Bloco B: vinculo admin_gestao criado para % no tenant %.', v_email, v_tenant;
END $$;

-- =============================================================================
-- 4. VERIFICACOES POSTERIORES
-- =============================================================================

\echo '--- 4.1 ROOT ativos (esperado: exatamente 1) ---'
SELECT p.email, p.nome, rp.granted_at, rp.revoked_at
FROM root_privileges rp JOIN people p ON p.id = rp.person_id
ORDER BY rp.revoked_at NULLS FIRST, rp.granted_at;

\echo '--- 4.2 Vinculos em tenant_memberships ---'
SELECT p.nome AS pessoa, p.email, t.nome AS tenant, r.key AS role_key, tm.papel, tm.status, tm.is_root
FROM tenant_memberships tm
JOIN people p ON p.id = tm.person_id
JOIN tenants t ON t.id = tm.tenant_id
LEFT JOIN roles r ON r.id = tm.role_id
ORDER BY p.nome;

\echo '--- 4.3 Autorizacao efetiva por conta ---'
SELECT p.email,
       exists (
         select 1 from root_privileges rp
         where rp.person_id = p.id and rp.revoked_at is null
       ) AS root_efetivo,
       case
         when exists (
           select 1 from root_privileges rp
           where rp.person_id = p.id and rp.revoked_at is null
         ) then (select count(*) from permissions)
         else (
           select count(distinct pr.id)
           from permissions pr
           join role_permissions rp on rp.permission_id = pr.id
           join tenant_memberships tm on tm.role_id = rp.role_id
           where tm.person_id = p.id
             and tm.status = 'ativo'
             and tm.tenant_id = '00000000-0000-0000-0000-000000000001'
             and (tm.expira_em is null or tm.expira_em > now())
         )
       end AS total_permissoes
FROM people p
ORDER BY p.email;

\echo '--- 4.4 Integridade referencial ---'
SELECT 'membership sem pessoa' AS verificacao, count(*) FROM tenant_memberships tm
  WHERE NOT EXISTS (SELECT 1 FROM people p WHERE p.id = tm.person_id)
UNION ALL
SELECT 'membership sem tenant', count(*) FROM tenant_memberships tm
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = tm.tenant_id)
UNION ALL
SELECT 'membership sem role', count(*) FROM tenant_memberships tm
  WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = tm.role_id)
UNION ALL
SELECT 'root_privilege sem pessoa', count(*) FROM root_privileges rp
  WHERE NOT EXISTS (SELECT 1 FROM people p WHERE p.id = rp.person_id);

\echo '--- 4.5 Unidades e dados preservados ---'
SELECT t.nome AS tenant, count(ru.id) AS unidades, count(r.id) AS remocoes
FROM tenants t
LEFT JOIN remocao_unidade ru ON ru.tenant_id = t.id
LEFT JOIN remocao r ON r.tenant_id = t.id
GROUP BY t.nome;

\echo '--- 4.6 Trilha de auditoria da revogacao ---'
SELECT tenant_id, acao, entidade, registro_id, detalhes, usuario_id, usuario_nome, created_at
FROM remocao_auditoria
WHERE acao IN ('root_revoked', 'root_granted')
ORDER BY created_at DESC LIMIT 10;

DO $$
DECLARE
  v_roots_ativos integer;
  v_evandro uuid;
  v_dev uuid;
  v_root_admin uuid;
  v_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- 4.7 CONDICOES DE INTERRUPCAO pos-correcao
  SELECT count(*) INTO v_roots_ativos FROM root_privileges WHERE revoked_at IS NULL;
  IF v_roots_ativos <> 1 THEN
    RAISE EXCEPTION 'ABORT: esperado exatamente 1 ROOT ativo ao final, encontrado %', v_roots_ativos;
  END IF;

  SELECT id INTO v_evandro FROM people WHERE email = 'evandro_j.o.a@hotmail.com';
  SELECT id INTO v_dev FROM people WHERE email = 'dev@remocaoalpha.local';
  SELECT id INTO v_root_admin FROM people WHERE email = 'mewwavegestaoalpha@hotmail.com';

  IF NOT EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_evandro AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: Evandro Andrade perdeu o ROOT — estado invalido';
  END IF;
  IF EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_dev AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: dev@remocaoalpha.local continua com ROOT';
  END IF;
  IF EXISTS (SELECT 1 FROM root_privileges WHERE person_id = v_root_admin AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'ABORT: mewwavegestaoalpha@hotmail.com continua com ROOT';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE person_id = v_dev AND tenant_id = v_tenant AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'ABORT: dev@remocaoalpha.local perdeu o vinculo tenant-scoped';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tenant_memberships
    WHERE person_id = v_root_admin AND tenant_id = v_tenant AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'ABORT: mewwavegestaoalpha@hotmail.com ficou sem nenhum acesso ao tenant';
  END IF;
  IF (SELECT count(*) FROM tenants WHERE id = v_tenant) <> 1 THEN
    RAISE EXCEPTION 'ABORT: o tenant 0000...0001 nao esta intacto';
  END IF;
  IF (SELECT count(*) FROM remocao_unidade WHERE tenant_id = v_tenant) <> 2 THEN
    RAISE EXCEPTION 'ABORT: as unidades (Santos e Poa) nao estao intactas';
  END IF;

  RAISE NOTICE 'Pos-correcao OK: 1 ROOT ativo, vinculos preservados, unidades intactas.';
END $$;

-- =============================================================================
-- 5. COMMIT / ROLLBACK
-- =============================================================================
-- Revise as quatro secoes acima. Para confirmar, com o arquivo aberto no psql:
--   COMMIT;
-- Para descartar tudo:
--   ROLLBACK;
-- Este arquivo termina sem COMMIT/ROLLBACK automatico de proposito.

\echo '--- Revise as saidas acima. Execute COMMIT; ou ROLLBACK; manualmente. ---'
