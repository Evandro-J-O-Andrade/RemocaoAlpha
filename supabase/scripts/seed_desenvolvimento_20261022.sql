-- Seed de desenvolvimento/teste — RemocaoAlpha
-- Data: 2026-10-22
-- Status: DRAFT — revisar antes de aplicar; nao executar em producao.
--
-- Escopo:
--   - Tenant real: Instituto Alpha de Medicina para Saúde (0000...0001)
--   - Unidades reais: SANTOS (matriz) e POA (filial) — preservadas
--   - 9 pessoas de teste, uma por perfil, com membership coerente
--   - 12 remocoes de teste em estados variados
--
-- Idempotencia: todas as insercoes usam ON CONFLICT / WHERE NOT EXISTS.
-- Executar duas vezes nao duplica nada.
--
-- Contas de autenticacao: este seed cria apenas people + memberships.
-- As contas em auth.users devem ser criadas via fluxo seguro (Supabase Auth
-- signUp) ou via script administrativo local com credenciais fornecidas pelo
-- desenvolvedor. Ver secao "Contas de teste" ao final.
--
-- NAO executar em producao: este seed e exclusivo para desenvolvimento/teste.

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- 1. Tenant e unidades (preservar os existentes)
-- =============================================================================
-- Nada a fazer: o tenant (0000...0001) e as unidades SANTOS/POA ja existem.

-- =============================================================================
-- 2. Pessoas de teste (idempotente por email)
-- =============================================================================
-- IDs fixos para facilitar testes e referencias cruzadas.

DO $$
DECLARE
  v_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
  v_santos uuid;
  v_poa uuid;
BEGIN
  SELECT id INTO v_santos FROM remocao_unidade WHERE codigo = 'SANTOS' AND tenant_id = v_tenant;
  SELECT id INTO v_poa FROM remocao_unidade WHERE codigo = 'POA' AND tenant_id = v_tenant;

  IF v_santos IS NULL OR v_poa IS NULL THEN
    RAISE EXCEPTION 'ABORT: unidades SANTOS/POA nao encontradas para o tenant %', v_tenant;
  END IF;

  -- Pessoas (idempotente por email)
  INSERT INTO people (id, nome, email, created_at, updated_at) VALUES
    ('11111111-0000-0000-0000-000000000001', 'Admin Gestao Teste', 'admin.gestao@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000002', 'Gestor Operacional Teste', 'gestor@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000003', 'Suporte Master Teste', 'suporte.master@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000004', 'Suporte TI Teste', 'suporte.ti@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000005', 'Motorista Teste', 'motorista@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000006', 'Enfermeira Teste', 'enfermeira@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000007', 'Medico Teste', 'medico@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000008', 'Solicitante Teste', 'solicitante@teste.local', now(), now()),
    ('11111111-0000-0000-0000-000000000009', 'Enfermeira Coordenadora Teste', 'enfermeira.coord@teste.local', now(), now())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Pessoas de teste: 9 registros inseridos ou ja existentes.';
END $$;

-- =============================================================================
-- 3. Vinculos (memberships) idempotentes por (tenant, person)
-- =============================================================================

DO $$
DECLARE
  v_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
  v_role_admin_gestao uuid;
  v_role_gestor uuid;
  v_role_suporte_master uuid;
  v_role_suporte_ti uuid;
  v_role_motorista uuid;
  v_role_enfermeiro uuid;
  v_role_medico uuid;
  v_role_atendente uuid;
BEGIN
  SELECT id INTO v_role_admin_gestao FROM roles WHERE key = 'admin_gestao';
  SELECT id INTO v_role_gestor FROM roles WHERE key = 'gestor';
  SELECT id INTO v_role_suporte_master FROM roles WHERE key = 'suporte_master';
  SELECT id INTO v_role_suporte_ti FROM roles WHERE key = 'suporte_ti';
  SELECT id INTO v_role_motorista FROM roles WHERE key = 'motorista';
  SELECT id INTO v_role_enfermeiro FROM roles WHERE key = 'enfermeiro';
  SELECT id INTO v_role_medico FROM roles WHERE key = 'medico';
  SELECT id INTO v_role_atendente FROM roles WHERE key = 'atendente';

  -- Admin Gestao (admin_gestao, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000001', v_role_admin_gestao, 'admin_gestao', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Gestor Operacional (gestor, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000002', v_role_gestor, 'gestor', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Suporte Master (suporte_master, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000003', v_role_suporte_master, 'suporte_master', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Suporte TI (suporte_ti, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000004', v_role_suporte_ti, 'suporte_ti', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Motorista (motorista, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000005', v_role_motorista, 'motorista', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Enfermeira (enfermeiro, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000006', v_role_enfermeiro, 'enfermeiro', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Medico (medico, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000007', v_role_medico, 'medico', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Solicitante (atendente, Santos)
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000008', v_role_atendente, 'atendente', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  -- Enfermeira Coordenadora (enfermeiro_chefe, Santos) — gestao de equipe
  INSERT INTO tenant_memberships (tenant_id, person_id, role_id, papel, status, aprovado_em)
  VALUES (v_tenant, '11111111-0000-0000-0000-000000000009', v_role_enfermeiro_chefe, 'enfermeiro_chefe', 'ativo', now())
  ON CONFLICT (tenant_id, person_id) DO NOTHING;

  RAISE NOTICE 'Memberships de teste: 9 registros inseridos ou ja existentes.';
END $$;

-- =============================================================================
-- 4. Remocoes de teste (idempotente por numero)
-- =============================================================================
-- Remocoes em estados variados para testar filtros, paginacao e relatorios.

DO $$
DECLARE
  v_tenant constant uuid := '00000000-0000-0000-0000-000000000001';
  v_santos uuid;
  v_poa uuid;
  v_hospital_guilherme uuid;
  v_hospital_ferraz uuid;
BEGIN
  SELECT id INTO v_santos FROM remocao_unidade WHERE codigo = 'SANTOS' AND tenant_id = v_tenant;
  SELECT id INTO v_poa FROM remocao_unidade WHERE codigo = 'POA' AND tenant_id = v_tenant;

  -- Tentar localizar hospitais de referencia (se existirem)
  SELECT id INTO v_hospital_guilherme FROM remocao_tabela_referencia
    WHERE tenant_id = v_tenant AND tipo = 'destino' LIMIT 1;
  SELECT id INTO v_hospital_ferraz FROM remocao_tabela_referencia
    WHERE tenant_id = v_tenant AND tipo = 'destino' OFFSET 1 LIMIT 1;

  -- Remocoes de teste (idempotente por numero)
  INSERT INTO remocao (tenant_id, numero, status, paciente_nome, finalidade, origem_unidade_id, created_by, created_at)
  VALUES
    (v_tenant, 'REM-TEST-001', 'SOLICITADA', 'Paciente Teste 001', 'exame', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '1 day'),
    (v_tenant, 'REM-TEST-002', 'EM_AVALIACAO', 'Paciente Teste 002', 'consulta', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '2 days'),
    (v_tenant, 'REM-TEST-003', 'AGUARDANDO_DESTINO', 'Paciente Teste 003', 'procedimento', v_poa, '11111111-0000-0000-0000-000000000008', now() - interval '3 days'),
    (v_tenant, 'REM-TEST-004', 'DESTINO_CONFIRMADO', 'Paciente Teste 004', 'transferencia_inter_hospitalar', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '4 days'),
    (v_tenant, 'REM-TEST-005', 'AGUARDANDO_EQUIPE', 'Paciente Teste 005', 'exame', v_poa, '11111111-0000-0000-0000-000000000008', now() - interval '5 days'),
    (v_tenant, 'REM-TEST-006', 'EQUIPE_CONFIRMADA', 'Paciente Teste 006', 'consulta', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '6 days'),
    (v_tenant, 'REM-TEST-007', 'AGUARDANDO_MOTORISTA', 'Paciente Teste 007', 'procedimento', v_poa, '11111111-0000-0000-0000-000000000008', now() - interval '7 days'),
    (v_tenant, 'REM-TEST-008', 'EM_DESLOCAMENTO', 'Paciente Teste 008', 'exame', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '8 days'),
    (v_tenant, 'REM-TEST-009', 'PACIENTE_ENTREGUE', 'Paciente Teste 009', 'consulta', v_poa, '11111111-0000-0000-0000-000000000008', now() - interval '9 days'),
    (v_tenant, 'REM-TEST-010', 'ENCERRADA', 'Paciente Teste 010', 'procedimento', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '10 days'),
    (v_tenant, 'REM-TEST-011', 'CANCELADA', 'Paciente Teste 011', 'exame', v_poa, '11111111-0000-0000-0000-000000000008', now() - interval '11 days'),
    (v_tenant, 'REM-TEST-012', 'SUSPENSA', 'Paciente Teste 012', 'consulta', v_santos, '11111111-0000-0000-0000-000000000008', now() - interval '12 days')
  ON CONFLICT (tenant_id, numero) DO NOTHING;

  RAISE NOTICE 'Remocoes de teste: 12 registros inseridos ou ja existentes.';
END $$;

-- =============================================================================
-- 5. Verificacao final
-- =============================================================================
\echo '--- Pessoas de teste ---'
SELECT id, nome, email FROM people WHERE id::text LIKE '11111111-%' ORDER BY nome;

\echo '--- Memberships de teste ---'
SELECT p.nome, p.email, r.key AS role, tm.status
FROM tenant_memberships tm
JOIN people p ON p.id = tm.person_id
LEFT JOIN roles r ON r.id = tm.role_id
WHERE p.id::text LIKE '11111111-%'
ORDER BY p.nome;

\echo '--- Remocoes de teste ---'
SELECT numero, status, finalidade, origem_unidade_id FROM remocao
WHERE numero LIKE 'REM-TEST-%' ORDER BY numero;

COMMIT;

-- =============================================================================
-- CONTAS DE TESTE (autenticacao)
-- =============================================================================
-- As pessoas acima foram criadas em `people`, mas ainda nao possuem conta em
-- auth.users. Para testar o login, crie as contas via Supabase Auth (Dashboard
-- ou CLI) com os emails abaixo e senhas de desenvolvimento:
--
--   admin.gestao@teste.local      -> perfil admin_gestao
--   gestor@teste.local            -> perfil gestor
--   suporte.master@teste.local    -> perfil suporte_master
--   suporte.ti@teste.local        -> perfil suporte_ti
--   motorista@teste.local         -> perfil motorista
--   enfermeira@teste.local        -> perfil enfermeiro
--   medico@teste.local            -> perfil medico
--   solicitante@teste.local       -> perfil atendente
--   enfermeira.coord@teste.local  -> perfil enfermeiro_chefe
--
-- Apos criar a conta, o AuthProvider resolve automaticamente a pessoa e o
-- vinculo via people.id = auth.users.id. Se o id gerado pelo Supabase Auth
-- for diferente do id fixo acima, atualize people.id e tenant_memberships.person_id
-- para corresponder ao id real de auth.users.
--
-- ROOT global: evandro_j.o.a@hotmail.com (ja existe, nao recriar).
-- =============================================================================
