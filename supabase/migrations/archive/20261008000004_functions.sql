-- =============================================================================
-- REMOÇÃO MODULE — Real-time functions, computed views, and storage
-- =============================================================================

-- =============================================================================
-- Function: generate_remocao_number (sequential per tenant)
-- =============================================================================
create or replace function generate_remocao_number(p_tenant_id uuid)
returns text as $$
declare
  v_ano text;
  v_count integer;
  v_result text;
begin
  v_ano := to_char(now(), 'YYYY');
  select count(*) + 1 into v_count
  from remocao
  where tenant_id = p_tenant_id
    and date_trunc('year', created_at) = date_trunc('year', now());
  v_result := v_ano || lpad(v_count::text, 4, '0');
  return v_result;
end;
$$ language plpgsql;

-- =============================================================================
-- Function: validar_transicao_status (enforces state machine, section 13)
-- =============================================================================
create or replace function validar_transicao_status(
  status_atual remocao_status,
  status_novo remocao_status
) returns boolean as $$
begin
  -- Cancelamento/suspensão can happen from any non-terminal state
  if status_novo in ('CANCELADA', 'SUSPENSA') then
    return true;
  end if;

  -- INTERCORRENCIA can happen from any non-terminal state
  if status_novo = 'INTERCORRENCIA' then
    return status_atual not in ('ENCERRADA', 'CANCELADA', 'SUSPENSA', 'RETORNOU_UNIDADE', 'NAO_REALIZADA');
    return true;
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
    else return false;
  end case;
end;
$$ language plpgsql;

-- =============================================================================
-- Function: update_remocao_status (transition guard)
-- =============================================================================
create or replace function update_remocao_status(
  p_remocao_id uuid,
  p_status_novo remocao_status,
  p_usuario_id uuid,
  p_motivo text default null
) returns remocao_status as $$
declare
  v_status_atual remocao_status;
  v_tenant uuid;
begin
  select status, tenant_id into v_status_atual, v_tenant
  from remocao where id = p_remocao_id;

  if not found then
    raise exception 'Remocao not found: %', p_remocao_id;
  end if;

  if validar_transicao_status(v_status_atual, p_status_novo) then
    update remocao
    set status = p_status_novo,
        updated_by = p_usuario_id,
        updated_at = now(),
        motivo_cancelamento = case when p_status_novo = 'CANCELADA' then p_motivo else motivo_cancelamento end,
        motivo_suspensao = case when p_status_novo = 'SUSPENSA' then p_motivo else motivo_suspensao end
    where id = p_remocao_id;
  else
    raise exception 'Invalid transition: % -> %', v_status_atual, p_status_novo;
  end if;

  return p_status_novo;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- Function: calcular_km_percorridos and tempo total (section 16)
-- =============================================================================
create or replace function finalizar_checkout(
  p_remocao_id uuid,
  p_quilometragem_inicial integer,
  p_quilometragem_final integer
) returns integer as $$
declare
  v_percorridos integer;
begin
  v_percorridos := p_quilometragem_final - p_quilometragem_inicial;
  update remocao
  set quilometragem_final = p_quilometragem_final,
      quilometragem_percorrida = v_percorridos,
      tempo_total = now() - (select created_at from remocao_checkin where remocao_id = p_remocao_id order by created_at asc limit 1)
  where id = p_remocao_id;
  return v_percorridos;
end;
$$ language plpgsql;

-- =============================================================================
-- Real-time: remocao_evento is broadcast automatically via Supabase Realtime
-- No extra trigger needed; Realtime listens on table changes.
-- =============================================================================

-- =============================================================================
-- Storage bucket for documents
-- =============================================================================
-- This is created via SQL:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('remocao-documentos', 'remocao-documentos', false, 52428800,
  array['application/pdf','image/jpeg','image/png','image/heic','image/heif'])
on conflict do nothing;

-- Storage RLS policies
create policy "authenticated users can upload documents"
on storage.objects for insert
with check (bucket_id = 'remocao-documentos');

create policy "authenticated users can view documents"
on storage.objects for select
using (bucket_id = 'remocao-documentos');
