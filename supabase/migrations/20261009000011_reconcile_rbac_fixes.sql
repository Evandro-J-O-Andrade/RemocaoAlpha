-- =============================================================================
-- REMOCAO ALPHA -- RBAC Reconciliation & Security Fixes (011)
-- =============================================================================
-- Purpose:
--   1. Add missing remocao.documento.read permission and assign to roles.
--   2. Assign remocao.veiculo.scalate to admin/admin_gestao roles.
--   3. Remove admin.root.grant and admin.root.revoke from tenant admin role
--      (only admin_master / ROOT may grant or revoke ROOT privileges).
--   4. Backfill tenant_memberships.role_id for legacy rows.
--   5. Add ROOT bypass to functions that only check is_tenant_member().
--   6. Add access control to validate_safety_checks().
-- =============================================================================
-- IMPORTANT: This migration runs AFTER 010_reconciliation_rbac_seed.sql
-- which already creates admin_master, root_privileges, and the updated
-- has_permission() with ROOT bypass.
-- =============================================================================

-- =============================================================================
-- 1. Add missing permission: remocao.documento.read
-- =============================================================================
INSERT INTO permissions (key, nome, categoria)
VALUES
  ('remocao.documento.read', 'Visualizar documentos', 'documento')
ON CONFLICT (key) DO NOTHING;

-- 2. Assign documento.read to roles that need it
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'remocao.documento.read'
WHERE r.key IN ('admin', 'admin_gestao', 'enfermeiro_chefe', 'enfermeiro', 'medico', 'gestor')
ON CONFLICT DO NOTHING;

-- 3. Assign veiculo.scalate to admin and admin_gestao
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key = 'remocao.veiculo.scalate'
WHERE r.key IN ('admin', 'admin_gestao')
ON CONFLICT DO NOTHING;

-- 4. Remove root grant/revoke from tenant admin role (only admin_master may grant ROOT)
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE key = 'admin')
  AND permission_id IN (
    SELECT id FROM permissions
    WHERE key IN ('admin.root.grant', 'admin.root.revoke')
  );

-- 5. Backfill tenant_memberships.role_id for legacy rows
-- First ensure papel column exists (legacy compatibility from old identity model)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_memberships'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_memberships' AND column_name = 'papel'
  ) THEN
    ALTER TABLE tenant_memberships ADD COLUMN papel text;
  END IF;
END;
$$;

UPDATE tenant_memberships tm
SET role_id = (
  SELECT r.id FROM roles r
  WHERE r.key = tm.papel
  LIMIT 1
)
WHERE role_id IS NULL AND papel IS NOT NULL;

-- 6. Make tenant_memberships.role_id NOT NULL (after backfill)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_memberships' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE tenant_memberships ALTER COLUMN role_id SET NOT NULL;
  END IF;
END;
$$;

-- 7. Add ROOT bypass to functions that only check is_tenant_member()

-- 7a. generate_remocao_number
CREATE OR REPLACE FUNCTION generate_remocao_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano text;
  v_count integer;
  v_result text;
BEGIN
  IF NOT (is_admin_master() OR is_tenant_member(p_tenant_id)) THEN
    RAISE EXCEPTION 'Access denied to tenant';
  END IF;
  v_ano := to_char(now(), 'YYYY');
  SELECT count(*) + 1 INTO v_count
  FROM remocao
  WHERE tenant_id = p_tenant_id
    AND date_trunc('year', created_at) = date_trunc('year', now());
  v_result := v_ano || lpad(v_count::text, 4, '0');
  RETURN v_result;
END;
$$;

-- 7b. update_remocao_status (add ROOT bypass to tenant membership check)
CREATE OR REPLACE FUNCTION update_remocao_status(
  p_remocao_id uuid,
  p_status_novo remocao_status,
  p_usuario_id uuid,
  p_motivo text DEFAULT NULL
) RETURNS remocao_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status remocao_status;
  v_tenant uuid;
  v_has_perm boolean;
BEGIN
  SELECT status, tenant_id INTO v_status, v_tenant
  FROM remocao WHERE id = p_remocao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Remocao not found: %', p_remocao_id;
  END IF;
  IF NOT (is_admin_master() OR is_tenant_member(v_tenant)) THEN
    RAISE EXCEPTION 'Access denied: not a member of remocao tenant';
  END IF;
  v_has_perm := has_permission('remocao.remocao.update_status');
  IF NOT v_has_perm THEN
    RAISE EXCEPTION 'Insufficient permissions to update status';
  END IF;
  IF NOT validar_transicao_status(v_status, p_status_novo) THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_status, p_status_novo;
  END IF;
IF p_status_novo = 'EM_DESLOCAMENTO' THEN
    IF NOT EXISTS (
      SELECT 1 FROM remocao r
      WHERE r.id = p_remocao_id
        AND r.veiculo_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot start displacement: missing vehicle';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM remocao_checklist c
      WHERE c.remocao_id = p_remocao_id
      HAVING count(*) > 0 AND bool_and(c.checked)
) THEN
      RAISE EXCEPTION 'Cannot start displacement: checklist incomplete';
    END IF;
  END IF;
  IF p_status_novo = 'PRONTA_PARA_SAIDA' THEN
    IF NOT EXISTS (
      SELECT 1 FROM remocao_checklist c
      WHERE c.remocao_id = p_remocao_id
      HAVING count(*) > 0 AND bool_and(c.checked)
    ) THEN
      RAISE EXCEPTION 'Cannot proceed to departure: checklist incomplete';
    END IF;
  END IF;
  IF p_status_novo = 'PACIENTE_ENTREGUE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM remocao r
      WHERE r.id = p_remocao_id
        AND r.destino_confirmed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot deliver patient: destination not confirmed';
    END IF;
  END IF;
  IF p_status_novo = 'ENCERRADA' THEN
    IF NOT EXISTS (
      SELECT 1 FROM remocao r
      WHERE r.id = p_remocao_id
        AND r.entrega_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot close: patient not delivered';
    END IF;
  END IF;
  UPDATE remocao
  SET status = p_status_novo,
      updated_by = p_usuario_id,
      updated_at = now(),
      motivo_cancelamento = CASE WHEN p_status_novo = 'CANCELADA' THEN p_motivo ELSE motivo_cancelamento END,
      motivo_suspensao = CASE WHEN p_status_novo = 'SUSPENSA' THEN p_motivo ELSE motivo_suspensao END
  WHERE id = p_remocao_id;
  INSERT INTO remocao_status_historico (
    remocao_id, status_anterior, status_novo,
    motivo, criado_por, criado_por_nome
  ) VALUES (
    p_remocao_id, v_status, p_status_novo,
    p_motivo, p_usuario_id,
    (SELECT nome FROM people WHERE id = p_usuario_id)
  );
  INSERT INTO remocao_evento (
    remocao_id, evento, nivel,
    criado_por, criado_por_nome
  ) VALUES (
    p_remocao_id, 'status_changed', 'info',
    p_usuario_id,
    (SELECT nome FROM people WHERE id = p_usuario_id)
  );
  RETURN p_status_novo;
END;
$$;

-- 8. Add access control to validate_safety_checks()
CREATE OR REPLACE FUNCTION validate_safety_checks(p_remocao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remocao remocao%rowtype;
  v_errors text[] := array[]::text[];
BEGIN
  SELECT * INTO v_remocao FROM remocao WHERE id = p_remocao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'errors', array['Remocao not found']);
  END IF;
  IF NOT (is_admin_master() OR is_tenant_member(v_remocao.tenant_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF NOT has_permission('remocao.remocao.read') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  IF v_remocao.paciente_nome IS NULL OR v_remocao.paciente_nome = '' THEN
    v_errors := v_errors || 'Paciente sem identificacao';
  END IF;
  IF v_remocao.finalidade = 'transferencia_inter_hospitalar' AND v_remocao.destino_confirmed_at IS NULL THEN
    v_errors := v_errors || 'Destino nao confirmado em transferencia';
  END IF;
  IF v_remocao.veiculo_id IS NULL THEN
    v_errors := v_errors || 'Veiculo nao atribuido';
  END IF;
  IF v_remocao.nivel_suporte = 'avancado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM remocao_equipe_membro mem
      JOIN remocao_equipe eq ON eq.id = mem.equipe_id
      WHERE eq.remocao_id = p_remocao_id
        AND mem.role = 'medico'
        AND mem.confirmado = true
    ) THEN
      v_errors := v_errors || 'Equipe nao tem medico para suporte avancado';
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM remocao_checklist c
    WHERE c.remocao_id = p_remocao_id
    HAVING count(*) > 0 AND bool_and(c.checked)
  ) THEN
    v_errors := v_errors || 'Checklist incompleto';
  END IF;
  IF v_remocao.checkout_at IS NOT NULL AND v_remocao.liberacao_por IS NULL THEN
    v_errors := v_errors || 'Saida sem liberacao';
  END IF;
  IF v_remocao.checkout_motorista_at IS NOT NULL AND v_remocao.checkin_at IS NULL THEN
    v_errors := v_errors || 'Checkout sem check-in';
  END IF;
  IF v_remocao.status = 'ENCERRADA' AND v_remocao.entrega_at IS NULL THEN
    v_errors := v_errors || 'Encerramento sem entrega do paciente';
  END IF;
  RETURN jsonb_build_object('ok', array_length(v_errors, 1) IS NULL, 'errors', v_errors);
END;
$$;
