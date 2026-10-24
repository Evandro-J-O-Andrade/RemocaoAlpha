-- Migration: Restringir RLS SELECT em remocao para motoristas (apenas remocoes atribuidas)
-- e adicionar verificacao de atribuicao na RPC update_remocao_status.
--
-- NAO APLICAR NO REMOTO SEM AUTORIZACAO EXPLICITA.
-- Migration criada localmente para revisao.

-- 1. Funcao auxiliar: verificar se o usuario autenticado e motorista atribuido a uma remocao
CREATE OR REPLACE FUNCTION is_motorista_assigned_to_remocao(p_remocao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM remocao_equipe e
    JOIN remocao_equipe_membro m ON m.equipe_id = e.id
    WHERE e.remocao_id = p_remocao_id
      AND m.profissional_id = auth.uid()
      AND m.role = 'motorista'
  );
$$;

-- 2. Funcao auxiliar: verificar se o usuario autenticado e motorista (role motorista ativo)
CREATE OR REPLACE FUNCTION is_motorista()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships tm
    JOIN roles r ON r.id = tm.role_id
    WHERE tm.person_id = auth.uid()
      AND tm.tenant_id = get_active_tenant_id()
      AND tm.status = 'ativo'
      AND (tm.expira_em IS NULL OR tm.expira_em > now())
      AND r.key = 'motorista'
  );
$$;

-- 3. Atualizar RLS SELECT em remocao: motoristas veem apenas remocoes atribuidas
-- (gestores e demais perfis continuam vendo todas as remocoes do tenant)
DROP POLICY IF EXISTS remocao_select ON remocao;
CREATE POLICY remocao_select ON remocao
  FOR SELECT
  USING (
    tenant_id = get_active_tenant_id()
    AND (
      -- Nao-motoristas veem todas as remocoes do tenant
      NOT is_motorista()
      -- Motoristas veem apenas remocoes onde estao atribuidos
      OR is_motorista_assigned_to_remocao(id)
    )
  );

-- 4. Atualizar RPC update_remocao_status para verificar atribuicao do motorista
-- Adiciona verificacao: se o usuario for motorista, deve estar atribuido a remocao
CREATE OR REPLACE FUNCTION update_remocao_status(
  p_remocao_id uuid,
  p_status_novo remocao_status,
  p_usuario_id uuid,
  p_motivo text default null
) returns remocao_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_atual remocao_status;
  v_tenant uuid;
  v_has_perm boolean;
begin
  -- Fetch current status and tenant
  select status, tenant_id into v_status_atual, v_tenant
  from remocao where id = p_remocao_id;

  if not found then
    raise exception 'Remocao not found: %', p_remocao_id;
  end if;

  -- Verify tenant membership
  if not (is_admin_master() OR is_tenant_member(v_tenant)) then
    raise exception 'Access denied: not a member of remocao tenant';
  end if;

  -- Verify permission
  v_has_perm := has_permission('remocao.remocao.update_status');
  if not v_has_perm then
    raise exception 'Insufficient permissions to update status';
  end if;

  -- NOVO: Se o usuario for motorista, deve estar atribuido a esta remocao
  if is_motorista() then
    if not is_motorista_assigned_to_remocao(p_remocao_id) then
      raise exception 'Access denied: motorista not assigned to this remocao';
    end if;
  end if;

  -- Validate transition
  if not validar_transicao_status(v_status_atual, p_status_novo) then
    raise exception 'Invalid transition: % -> %', v_status_atual, p_status_novo;
  end if;

  -- Additional validations for specific transitions
  if p_status_novo = 'EM_DESLOCAMENTO' then
    if not exists (
      select 1 from remocao r
      where r.id = p_remocao_id
        and r.veiculo_id is not null
    ) then
      raise exception 'Cannot start displacement: missing vehicle';
    end if;

    if not exists (
      select 1 from remocao_checklist c
      where c.remocao_id = p_remocao_id
      having count(*) > 0 and bool_and(c.checked)
    ) then
      raise exception 'Cannot start displacement: checklist incomplete';
    end if;
  end if;

  if p_status_novo = 'PRONTA_PARA_SAIDA' then
    if not exists (
      select 1 from remocao_checklist c
      where c.remocao_id = p_remocao_id
      having count(*) > 0 and bool_and(c.checked)
    ) then
      raise exception 'Cannot proceed to departure: checklist incomplete';
    end if;
  end if;

  if p_status_novo = 'PACIENTE_ENTREGUE' then
    if not exists (
      select 1 from remocao r
      where r.id = p_remocao_id
        and r.destino_confirmed_at is not null
    ) then
      raise exception 'Cannot deliver patient: destination not confirmed';
    end if;
  end if;

  if p_status_novo = 'ENCERRADA' then
    if not exists (
      select 1 from remocao r
      where r.id = p_remocao_id
        and r.entrega_at is not null
    ) then
      raise exception 'Cannot close: patient not delivered';
    end if;
  end if;

  -- Update status
  update remocao
  set status = p_status_novo,
      updated_by = p_usuario_id,
      updated_at = now(),
      motivo_cancelamento = case when p_status_novo = 'CANCELADA' then p_motivo else motivo_cancelamento end,
      motivo_suspensao = case when p_status_novo = 'SUSPENSA' then p_motivo else motivo_suspensao end
  where id = p_remocao_id;

  -- Log status change in history
  insert into remocao_status_historico (
    remocao_id, status_anterior, status_novo,
    motivo, criado_por, criado_por_nome
  ) values (
    p_remocao_id, v_status_atual, p_status_novo,
    p_motivo, p_usuario_id,
    (select nome from people where id = p_usuario_id)
  );

  -- Log event
  insert into remocao_evento (
    remocao_id, evento, descricao, nivel,
    criado_por, criado_por_nome
  ) values (
    p_remocao_id, 'status_changed',
    format('Status alterado de %s para %s', v_status_atual, p_status_novo),
    'info',
    p_usuario_id,
    (select nome from people where id = p_usuario_id)
  );

  return p_status_novo;
end;
$$;

-- Grants (preservar existentes)
REVOKE EXECUTE ON FUNCTION is_motorista_assigned_to_remocao(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_motorista_assigned_to_remocao(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_motorista() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_motorista() FROM anon;
REVOKE EXECUTE ON FUNCTION update_remocao_status(uuid, remocao_status, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION is_motorista_assigned_to_remocao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_motorista() TO authenticated;
