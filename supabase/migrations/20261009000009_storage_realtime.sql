-- =============================================================================
-- REMOÇÃO ALPHA — Storage, Realtime, and Audit Triggers
-- =============================================================================
-- Purpose: Storage bucket, RLS policies, realtime publication, and audit triggers
-- =============================================================================

-- =============================================================================
-- Storage bucket for documents (private)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'remocao-documentos',
  'remocao-documentos',
  false,
  52428800, -- 50MB
  array['application/pdf','image/jpeg','image/png','image/heic','image/heif','image/webp']
)
on conflict (id) do update set
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/heic','image/heif','image/webp'];

-- =============================================================================
-- Storage RLS policies for documents
-- =============================================================================

-- Upload: authenticated users in the same tenant
create policy "remocao_documentos_upload" on storage.objects for insert
with check (
  bucket_id = 'remocao-documentos'
  and exists (
    select 1 from remocao_documento rd
    join remocao r on r.id = rd.remocao_id
    where rd.storage_path = storage.objects.name
      and r.tenant_id = get_active_tenant_id()
      and has_permission('remocao.documento.upload')
  )
);

-- Select: users with read permission in the same tenant
create policy "remocao_documentos_select" on storage.objects for select
using (
  bucket_id = 'remocao-documentos'
  and exists (
    select 1 from remocao_documento rd
    join remocao r on r.id = rd.remocao_id
    where rd.storage_path = storage.objects.name
      and r.tenant_id = get_active_tenant_id()
      and has_permission('remocao.documento.read')
  )
);

-- Update: users with confer permission
create policy "remocao_documentos_update" on storage.objects for update
using (
  bucket_id = 'remocao-documentos'
  and exists (
    select 1 from remocao_documento rd
    join remocao r on r.id = rd.remocao_id
    where rd.storage_path = storage.objects.name
      and r.tenant_id = get_active_tenant_id()
      and has_permission('remocao.documento.conferir')
  )
)
with check (
  bucket_id = 'remocao-documentos'
  and exists (
    select 1 from remocao_documento rd
    join remocao r on r.id = rd.remocao_id
    where rd.storage_path = storage.objects.name
      and r.tenant_id = get_active_tenant_id()
      and has_permission('remocao.documento.conferir')
  )
);

-- =============================================================================
-- Function: create_signed_document_url — generate signed URL for document access
-- =============================================================================
create or replace function create_signed_document_url(
  p_document_id uuid,
  p_expires_in integer default 3600
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc remocao_documento%rowtype;
  v_url text;
begin
  select * into v_doc from remocao_documento where id = p_document_id;
  
  if not found then
    raise exception 'Document not found';
  end if;

  if not is_tenant_member(v_doc.tenant_id) and not is_admin_master() then
    raise exception 'Access denied';
  end if;

  if not has_permission('remocao.documento.read') then
    raise exception 'Insufficient permissions';
  end if;

  select storage.create_signed_url(v_doc.storage_bucket, v_doc.storage_path, p_expires_in)
  into v_url;

  -- Log access
  insert into remocao_auditoria (
    tenant_id, remocao_id, acao, entidade, registro_id,
    detalhes, usuario_id, usuario_nome
  ) values (
    v_doc.tenant_id, v_doc.remocao_id, 'document_access', 'documento', v_doc.id,
    jsonb_build_object('expires_in', p_expires_in), auth.uid(),
    (select nome from people where id = auth.uid())
  );

  return v_url;
end;
$$;

grant execute on function create_signed_document_url(uuid, integer) to authenticated;

-- =============================================================================
-- Realtime publication for operational tables
-- =============================================================================
-- Enable realtime on key tables
alter publication supabase_realtime add table remocao;
alter publication supabase_realtime add table remocao_status_historico;
alter publication supabase_realtime add table remocao_evento;
alter publication supabase_realtime add table remocao_intercorrencia;
alter publication supabase_realtime add table remocao_gps_posicao;
alter publication supabase_realtime add table remocao_checkin;
alter publication supabase_realtime add table remocao_checkout;
alter publication supabase_realtime add table remocao_documento;

-- Set replica identity for full row updates
alter table remocao replica identity full;
alter table remocao_status_historico replica identity full;
alter table remocao_evento replica identity full;
alter table remocao_intercorrencia replica identity full;
alter table remocao_gps_posicao replica identity full;
alter table remocao_checkin replica identity full;
alter table remocao_checkout replica identity full;
alter table remocao_documento replica identity full;

-- =============================================================================
-- Audit trigger: log status changes on remocao
-- =============================================================================
create or replace function remocao_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into remocao_status_historico (
      remocao_id, status_anterior, status_novo,
      motivo, criado_por, criado_por_nome
    ) values (
      new.id, old.status, new.status,
      case 
        when new.status = 'CANCELADA' then new.motivo_cancelamento
        when new.status = 'SUSPENSA' then new.motivo_suspensao
        else null
      end,
      new.updated_by,
      (select nome from people where id = new.updated_by)
    );

    insert into remocao_evento (
      remocao_id, evento, descricao, nivel,
      criado_por, criado_por_nome
    ) values (
      new.id, 'status_changed',
      format('Status alterado de %s para %s', old.status, new.status),
      case when new.status in ('INTERCORRENCIA', 'CANCELADA', 'EM_DESLOCAMENTO') then 'warning' else 'info' end,
      new.updated_by,
      (select nome from people where id = new.updated_by)
    );
  end if;

  -- Log other important field changes
  if old.veiculo_id is distinct from new.veiculo_id then
    insert into remocao_evento (remocao_id, evento, descricao, nivel, criado_por, criado_por_nome)
    values (new.id, 'vehicle_changed', 
      format('Veículo alterado de %s para %s', 
        coalesce((select placa from remocao_veiculo where id = old.veiculo_id), 'nenhum'),
        coalesce((select placa from remocao_veiculo where id = new.veiculo_id), 'nenhum')),
      'info', new.updated_by, (select nome from people where id = new.updated_by));
  end if;

  return new;
end;
$$;

drop trigger if exists remocao_status_audit on remocao;
create trigger remocao_status_audit
  after update on remocao
  for each row
  execute function remocao_audit_trigger();

-- =============================================================================
-- Audit trigger: log document status changes
-- =============================================================================
create or replace function remocao_documento_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into remocao_evento (
      remocao_id, evento, descricao, nivel,
      criado_por, criado_por_nome, dados
    ) values (
      new.remocao_id, 'document_status_changed',
      format('Documento %s: %s -> %s', new.titulo, old.status, new.status),
      'info', new.updated_by, (select nome from people where id = new.updated_by),
      jsonb_build_object('documento_id', new.id, 'status_anterior', old.status, 'status_novo', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists remocao_documento_status_audit on remocao_documento;
create trigger remocao_documento_status_audit
  after update on remocao_documento
  for each row
  execute function remocao_documento_audit_trigger();

-- =============================================================================
-- Trigger: auto-create checklist items from template on remocao create
-- =============================================================================
create or replace function create_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
begin
  for v_template in
    select secao, item_key, item_label
    from remocao_checklist_default
    where new.tipo_transporte is null or v_template.tipos_aplicaveis @> ARRAY[new.tipo_transporte::text]
  loop
    insert into remocao_checklist (remocao_id, secao, item_key, item_label)
    values (new.id, v_template.secao, v_template.item_key, v_template.item_label)
    on conflict (remocao_id, secao, item_key) do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists trigger_create_default_checklist on remocao;
create trigger trigger_create_default_checklist
  after insert on remocao
  for each row
  execute function create_default_checklist();

-- =============================================================================
-- Function: get_tenant_stats — aggregate stats for dashboard
-- =============================================================================
create or replace function get_tenant_stats(p_tenant_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := coalesce(p_tenant_id, get_active_tenant_id());
  v_stats jsonb;
begin
  if not is_tenant_member(v_tenant_id) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'total_remocoes', total_remocoes,
    'por_status', por_status,
    'por_prioridade', por_prioridade,
    'por_finalidade', por_finalidade,
    'veiculos_disponiveis', veiculos_disponiveis,
    'motoristas_ativos', motoristas_ativos,
    'remocoes_hoje', remocoes_hoje
  ) into v_stats
  from (
    select
      (select count(*) from remocao where tenant_id = v_tenant_id) as total_remocoes,
      (select jsonb_object_agg(status, cnt) from (
        select status, count(*) as cnt from remocao where tenant_id = v_tenant_id group by status
      ) s) as por_status,
      (select jsonb_object_agg(prioridade, cnt) from (
        select prioridade, count(*) as cnt from remocao where tenant_id = v_tenant_id group by prioridade
      ) s) as por_prioridade,
      (select jsonb_object_agg(finalidade, cnt) from (
        select finalidade, count(*) as cnt from remocao where tenant_id = v_tenant_id group by finalidade
      ) s) as por_finalidade,
      (select count(*) from remocao_veiculo where tenant_id = v_tenant_id and situacao = 'disponivel') as veiculos_disponiveis,
      (select count(*) from remocao_motorista where tenant_id = v_tenant_id and status = 'disponivel' and aprovado = true) as motoristas_ativos,
      (select count(*) from remocao where tenant_id = v_tenant_id and date_trunc('day', created_at) = date_trunc('day', now())) as remocoes_hoje
  ) t;

  return v_stats;
end;
$$;

grant execute on function get_tenant_stats(uuid) to authenticated;

-- =============================================================================
-- Function: cleanup_old_gps_positions — maintenance function
-- =============================================================================
create or replace function cleanup_old_gps_positions(p_older_than_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if not has_permission('admin.tenant.manage') then
    raise exception 'Insufficient permissions';
  end if;

  delete from remocao_gps_posicao
  where recorded_at < now() - (p_older_than_days || ' days')::interval
  and remocao_id in (select id from remocao where tenant_id = get_active_tenant_id());

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function cleanup_old_gps_positions(integer) to authenticated;