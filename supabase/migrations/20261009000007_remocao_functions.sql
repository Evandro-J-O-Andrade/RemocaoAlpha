-- =============================================================================
-- REMOÇÃO ALPHA — Functions with Validation (Corrected from 004)
-- =============================================================================
-- Purpose: Real-time functions, computed views, storage, and state machine
-- Key fix: All functions validate tenant, permissions, and state transitions
-- =============================================================================

-- =============================================================================
-- Function: generate_remocao_number (sequential per tenant per year)
-- =============================================================================
create or replace function generate_remocao_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano text;
  v_count integer;
  v_result text;
begin
  -- Verify tenant access
  if not is_tenant_member(p_tenant_id) then
    raise exception 'Access denied to tenant';
  end if;

  v_ano := to_char(now(), 'YYYY');
  select count(*) + 1 into v_count
  from remocao
  where tenant_id = p_tenant_id
    and date_trunc('year', created_at) = date_trunc('year', now());

  v_result := v_ano || lpad(v_count::text, 4, '0');
  return v_result;
end;
$$;

-- =============================================================================
-- Function: validar_transicao_status (enforces state machine)
-- =============================================================================
create or replace function validar_transicao_status(
  status_atual remocao_status,
  status_novo remocao_status
) returns boolean
language plpgsql
as $$
begin
  -- Cancelamento/suspensão can happen from any non-terminal state
  if status_novo in ('CANCELADA', 'SUSPENSA') then
    return status_atual not in ('ENCERRADA', 'CANCELADA');
  end if;

  -- INTERCORRENCIA can happen from any non-terminal state
  if status_novo = 'INTERCORRENCIA' then
    return status_atual not in ('ENCERRADA', 'CANCELADA', 'SUSPENSA', 'RETORNOU_UNIDADE', 'NAO_REALIZADA');
  end if;

  -- NAO_REALIZADA from non-terminal states
  if status_novo = 'NAO_REALIZADA' then
    return status_atual not in ('ENCERRADA', 'CANCELADA', 'SUSPENSA');
  end if;

  -- Forward transitions only for normal flow
  case status_atual || '->' || status_novo of
    when 'SOLICITADA->EM_AVALIACAO' then return true;
    when 'EM_AVALIACAO->AGUARDANDO_DESTINO' then return true;
    when 'AGUARDANDO_DESTINO->DESTINO_CONFIRMADO' then return true;
    when 'DESTINO_CONFIRMADO->AGUARDANDO_EQUIPE' then return true;
    when 'AGUARDANDO_EQUIPE->EQUIPE_CONFIRMADA' then return true;
    when 'EQUIPE_CONFIRMADA->AGUARDANDO_MOTORISTA' then return true;
    when 'AGUARDANDO_MOTORISTA->MOTORISTA_CHECKIN' then return true;
    when 'MOTORISTA_CHECKIN->MOTORISTA_CONFIRMADO' then return true;
    when 'MOTORISTA_CONFIRMADO->CHECKLIST_PENDENTE' then return true;
    when 'CHECKLIST_PENDENTE->PRONTA_PARA_SAIDA' then return true;
    when 'PRONTA_PARA_SAIDA->EM_DESLOCAMENTO' then return true;
    when 'EM_DESLOCAMENTO->CHEGADA_DESTINO' then return true;
    when 'CHEGADA_DESTINO->PACIENTE_ENTREGUE' then return true;
    when 'PACIENTE_ENTREGUE->RETORNANDO' then return true;
    when 'RETORNANDO->RETORNOU_UNIDADE' then return true;
    when 'RETORNOU_UNIDADE->ENCERRADA' then return true;
    -- Suspensa can resume
    when 'SUSPENSA->AGUARDANDO_MOTORISTA' then return true;
    when 'SUSPENSA->CANCELADA' then return true;
    when 'SUSPENSA->ENCERRADA' then return true;
    else return false;
  end case;
end;
$$;

-- =============================================================================
-- Function: update_remocao_status (transition guard with authz)
-- =============================================================================
create or replace function update_remocao_status(
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
  if not is_tenant_member(v_tenant) then
    raise exception 'Access denied: not a member of remocao tenant';
  end if;

  -- Verify permission
  v_has_perm := has_permission('remocao.remocao.update_status');
  if not v_has_perm then
    raise exception 'Insufficient permissions to update status';
  end if;

  -- Validate transition
  if not validar_transicao_status(v_status_atual, p_status_novo) then
    raise exception 'Invalid transition: % -> %', v_status_atual, p_status_novo;
  end if;

  -- Additional validations for specific transitions
  if p_status_novo = 'EM_DESLOCAMENTO' then
    -- Must have vehicle assigned
    if not exists (
      select 1 from remocao r
      where r.id = p_remocao_id
        and r.veiculo_id is not null
    ) then
      raise exception 'Cannot start displacement: missing vehicle';
    end if;

    -- Must have checklist complete
    if not exists (
      select 1 from remocao_checklist c
      where c.remocao_id = p_remocao_id
      having count(*) > 0 and bool_and(c.checked)
    ) then
      raise exception 'Cannot start displacement: checklist incomplete';
    end if;
  end if;

  if p_status_novo = 'PRONTA_PARA_SAIDA' then
    -- Must have checklist complete
    if not exists (
      select 1 from remocao_checklist c
      where c.remocao_id = p_remocao_id
      having count(*) > 0 and bool_and(c.checked)
    ) then
      raise exception 'Cannot proceed to departure: checklist incomplete';
    end if;
  end if;

  if p_status_novo = 'PACIENTE_ENTREGUE' then
    -- Must have destination confirmed
    if not exists (
      select 1 from remocao r
      where r.id = p_remocao_id
        and r.destino_confirmed_at is not null
    ) then
      raise exception 'Cannot deliver patient: destination not confirmed';
    end if;
  end if;

  if p_status_novo = 'ENCERRADA' then
    -- Must have patient delivered
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

-- =============================================================================
-- Function: can_transition_status (check if transition is valid)
-- =============================================================================
create or replace function can_transition_status(
  p_remocao_id uuid,
  p_status_novo remocao_status
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_atual remocao_status;
  v_tenant uuid;
begin
  select status, tenant_id into v_status_atual, v_tenant
  from remocao where id = p_remocao_id;

  if not found then
    return false;
  end if;

  if not is_tenant_member(v_tenant) then
    return false;
  end if;

  return validar_transicao_status(v_status_atual, p_status_novo);
end;
$$;

-- =============================================================================
-- Function: get_valid_transitions (get allowed next states)
-- =============================================================================
create or replace function get_valid_transitions(p_remocao_id uuid)
returns setof remocao_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_atual remocao_status;
  v_tenant uuid;
  v_transitions remocao_status[];
begin
  select status, tenant_id into v_status_atual, v_tenant
  from remocao where id = p_remocao_id;

  if not found or not is_tenant_member(v_tenant) then
    return;
  end if;

  -- Always allowed from non-terminal states
  v_transitions := array['CANCELADA', 'SUSPENSA'];
  
  if v_status_atual not in ('ENCERRADA', 'CANCELADA', 'SUSPENSA', 'RETORNOU_UNIDADE', 'NAO_REALIZADA') then
    v_transitions := v_transitions || 'INTERCORRENCIA';
  end if;

  if v_status_atual not in ('ENCERRADA', 'CANCELADA', 'SUSPENSA') then
    v_transitions := v_transitions || 'NAO_REALIZADA';
  end if;

  -- Forward transitions based on current state
  case v_status_atual
    when 'SOLICITADA' then v_transitions := v_transitions || 'EM_AVALIACAO';
    when 'EM_AVALIACAO' then v_transitions := v_transitions || 'AGUARDANDO_DESTINO';
    when 'AGUARDANDO_DESTINO' then v_transitions := v_transitions || 'DESTINO_CONFIRMADO';
    when 'DESTINO_CONFIRMADO' then v_transitions := v_transitions || 'AGUARDANDO_EQUIPE';
    when 'AGUARDANDO_EQUIPE' then v_transitions := v_transitions || 'EQUIPE_CONFIRMADA';
    when 'EQUIPE_CONFIRMADA' then v_transitions := v_transitions || 'AGUARDANDO_MOTORISTA';
    when 'AGUARDANDO_MOTORISTA' then v_transitions := v_transitions || 'MOTORISTA_CHECKIN';
    when 'MOTORISTA_CHECKIN' then v_transitions := v_transitions || 'MOTORISTA_CONFIRMADO';
    when 'MOTORISTA_CONFIRMADO' then v_transitions := v_transitions || 'CHECKLIST_PENDENTE';
    when 'CHECKLIST_PENDENTE' then v_transitions := v_transitions || 'PRONTA_PARA_SAIDA';
    when 'PRONTA_PARA_SAIDA' then v_transitions := v_transitions || 'EM_DESLOCAMENTO';
    when 'EM_DESLOCAMENTO' then v_transitions := v_transitions || 'CHEGADA_DESTINO';
    when 'CHEGADA_DESTINO' then v_transitions := v_transitions || 'PACIENTE_ENTREGUE';
    when 'PACIENTE_ENTREGUE' then v_transitions := v_transitions || 'RETORNANDO';
    when 'RETORNANDO' then v_transitions := v_transitions || 'RETORNOU_UNIDADE';
    when 'RETORNOU_UNIDADE' then v_transitions := v_transitions || 'ENCERRADA';
    when 'SUSPENSA' then v_transitions := v_transitions || 'AGUARDANDO_MOTORISTA' || 'CANCELADA' || 'ENCERRADA';
  end case;

  return query select unnest(v_transitions);
end;
$$;

-- =============================================================================
-- Function: finalizar_checkout (calculate km and time)
-- =============================================================================
create or replace function finalizar_checkout(
  p_remocao_id uuid,
  p_quilometragem_inicial integer,
  p_quilometragem_final integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_percorridos integer;
  v_checkin_at timestamp with time zone;
  v_tenant uuid;
begin
  select tenant_id into v_tenant from remocao where id = p_remocao_id;
  
  if not found or not is_tenant_member(v_tenant) then
    raise exception 'Access denied';
  end if;

  if not has_permission('remocao.motorista.checkout') then
    raise exception 'Insufficient permissions';
  end if;

  v_percorridos := p_quilometragem_final - p_quilometragem_inicial;
  
  select created_at into v_checkin_at
  from remocao_checkin
  where remocao_id = p_remocao_id
  order by created_at asc
  limit 1;

  update remocao
  set quilometragem_final = p_quilometragem_final,
      quilometragem_percorrida = v_percorridos,
      tempo_total = case when v_checkin_at is not null then now() - v_checkin_at else null end,
      updated_at = now()
  where id = p_remocao_id;

  return v_percorridos;
end;
$$;

-- =============================================================================
-- Function: validate_safety_checks (server-side safety validation)
-- =============================================================================
create or replace function validate_safety_checks(p_remocao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remocao remocao%rowtype;
  v_checklist record;
  v_errors text[] := array[]::text[];
begin
  select * into v_remocao from remocao where id = p_remocao_id;
  if not found then
    return jsonb_build_object('ok', false, 'errors', array['Remocao not found']);
  end if;

  -- Check patient identification
  if v_remocao.paciente_nome is null or v_remocao.paciente_nome = '' then
    v_errors := v_errors || 'Paciente sem identificação';
  end if;

  -- Check destination confirmed for transfers
  if v_remocao.finalidade = 'transferencia_inter_hospitalar' and v_remocao.destino_confirmed_at is null then
    v_errors := v_errors || 'Destino não confirmado em transferência';
  end if;

  -- Check vehicle assigned
  if v_remocao.veiculo_id is null then
    v_errors := v_errors || 'Veículo não atribuído';
  end if;

  -- Check team has medic for advanced support
  if v_remocao.nivel_suporte = 'avancado' then
    if not exists (
      select 1 from remocao_equipe_membro mem
      join remocao_equipe eq on eq.id = mem.equipe_id
      where eq.remocao_id = p_remocao_id
        and mem.role = 'medico'
        and mem.confirmado = true
    ) then
      v_errors := v_errors || 'Equipe não tem médico para suporte avançado';
    end if;
  end if;

  -- Check checklist complete
  if not exists (
    select 1 from remocao_checklist c
    where c.remocao_id = p_remocao_id
    having count(*) > 0 and bool_and(c.checked)
  ) then
    v_errors := v_errors || 'Checklist incompleto';
  end if;

  -- Check checkout has liberacao
  if v_remocao.checkout_at is not null and v_remocao.liberacao_por is null then
    v_errors := v_errors || 'Saída sem liberação';
  end if;

  -- Check checkout without checkin
  if v_remocao.checkout_motorista_at is not null and v_remocao.checkin_at is null then
    v_errors := v_errors || 'Checkout sem check-in';
  end if;

  -- Check encerrada without entrega
  if v_remocao.status = 'ENCERRADA' and v_remocao.entrega_at is null then
    v_errors := v_errors || 'Encerramento sem entrega do paciente';
  end if;

  return jsonb_build_object('ok', array_length(v_errors, 1) is null, 'errors', v_errors);
end;
$$;

-- =============================================================================
-- Function: create_remocao_with_number (atomic create with number)
-- =============================================================================
create or replace function create_remocao_with_number(
  p_tenant_id uuid,
  p_payload jsonb,
  p_usuario_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
  v_remocao_id uuid;
begin
  if not is_tenant_member(p_tenant_id) then
    raise exception 'Access denied to tenant';
  end if;

  if not has_permission('remocao.remocao.create') then
    raise exception 'Insufficient permissions';
  end if;

  v_numero := generate_remocao_number(p_tenant_id);

  insert into remocao (
    tenant_id, numero, paciente_nome, paciente_prontuario,
    paciente_data_nascimento, paciente_sexo, paciente_diagnostico,
    paciente_condicao_clinica, paciente_precaucoes, paciente_alergias,
    paciente_necessidades_especiais, origem_unidade_id, origem_setor_id,
    origem_leito, destino_unidade_id, destino_setor_id, destino_endereco,
    destino_contato_nome, destino_contato_telefone, finalidade,
    tipo_transporte, nivel_suporte, prioridade, necessidade_medica,
    justificativa_medica, data_prevista, horario_previsto_saida,
    horario_previsto_atendimento, created_by
  ) values (
    p_tenant_id, v_numero,
    (p_payload->>'paciente_nome')::text,
    (p_payload->>'paciente_prontuario')::text,
    (p_payload->>'paciente_data_nascimento')::date,
    (p_payload->>'paciente_sexo')::text,
    (p_payload->>'paciente_diagnostico')::text,
    (p_payload->>'paciente_condicao_clinica')::remocao_condicao_clinica,
    (p_payload->>'paciente_precaucoes')::text,
    (p_payload->>'paciente_alergias')::text,
    (p_payload->>'paciente_necessidades_especiais')::text,
    (p_payload->>'origem_unidade_id')::uuid,
    (p_payload->>'origem_setor_id')::uuid,
    (p_payload->>'origem_leito')::text,
    (p_payload->>'destino_unidade_id')::uuid,
    (p_payload->>'destino_setor_id')::uuid,
    (p_payload->>'destino_endereco')::text,
    (p_payload->>'destino_contato_nome')::text,
    (p_payload->>'destino_contato_telefone')::text,
    (p_payload->>'finalidade')::remocao_finalidade,
    (p_payload->>'tipo_transporte')::remocao_tipo_transporte,
    (p_payload->>'nivel_suporte')::remocao_nivel_suporte,
    (p_payload->>'prioridade')::remocao_prioridade,
    (p_payload->>'necessidade_medica')::remocao_necessidade_medica,
    (p_payload->>'justificativa_medica')::text,
    (p_payload->>'data_prevista')::timestamp with time zone,
    (p_payload->>'horario_previsto_saida')::timestamp with time zone,
    (p_payload->>'horario_previsto_atendimento')::timestamp with time zone,
    p_usuario_id
  ) returning id into v_remocao_id;

  return v_remocao_id;
end;
$$;

-- =============================================================================
-- Grant execute permissions on functions
--     CRITICAL: REVOKE from PUBLIC first to prevent anon access via inherited privileges
-- =============================================================================
REVOKE EXECUTE ON FUNCTION generate_remocao_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION validar_transicao_status(remocao_status, remocao_status) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_remocao_status(uuid, remocao_status, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION can_transition_status(uuid, remocao_status) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_valid_transitions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalizar_checkout(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION validate_safety_checks(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_remocao_with_number(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_active_tenant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_active_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_default_tenant(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION invite_user_to_tenant(uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION approve_driver(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reject_driver(uuid, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION generate_remocao_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_transicao_status(remocao_status, remocao_status) TO authenticated;
GRANT EXECUTE ON FUNCTION update_remocao_status(uuid, remocao_status, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_transition_status(uuid, remocao_status) TO authenticated;
GRANT EXECUTE ON FUNCTION get_valid_transitions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION finalizar_checkout(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_safety_checks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_remocao_with_number(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_active_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_tenant(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_tenant(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_driver(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_driver(uuid, uuid, text) TO authenticated;