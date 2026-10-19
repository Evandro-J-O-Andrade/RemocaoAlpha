-- =============================================================================
-- REMOÇÃO MODULE — RLS Policies & Security
-- =============================================================================

-- Enable RLS on all remocao tables
alter table remocao enable row level security;
alter table remocao_paciente enable row level security;
alter table remocao_equipe enable row level security;
alter table remocao_equipe_membro enable row level security;
alter table remocao_veiculo enable row level security;
alter table remocao_motorista enable row level security;
alter table remocao_motorista_turno enable row level security;
alter table remocao_avaliacao_clinica enable row level security;
alter table remocao_checklist enable row level security;
alter table remocao_destino_confirmacao enable row level security;
alter table remocao_checkin enable row level security;
alter table remocao_checkout enable row level security;
alter table remocao_intercorrencia enable row level security;
alter table remocao_status_historico enable row level security;
alter table remocao_evento enable row level security;
alter table remocao_documento enable row level security;
alter table remocao_documento_extracao enable row level security;
alter table remocao_documento_conferencia enable row level security;
alter table remocao_rota enable row level security;
alter table remocao_gps_posicao enable row level security;
alter table remocao_auditoria enable row level security;
alter table remocao_tabela_referencia enable row level security;
alter table remocao_unidade enable row level security;
alter table remocao_setor enable row level security;

-- Helper: get tenant from auth user
-- Assumes a tenant_id column on auth.users metadata or a people table.
-- Adjust the expression to match your existing tenant model.
create or replace function get_tenant_id()
returns uuid as $$
  select coalesce(
    (current_setting('request.tenant_id', true))::uuid,
    (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.person_id = auth.uid()
        and tm.status = 'ativo'
        and (tm.expira_em is null or tm.expira_em > now())
      order by tm.aprovado_em desc nulls last
      limit 1
    )
  );
$$ language sql stable;

-- Helper: get current person/role
create or replace function get_current_person_id()
returns uuid as $$
  select coalesce(
    (current_setting('request.person_id', true))::uuid,
    auth.uid()
  );
$$ language sql stable;

-- Helper: check permission (delegates to existing RBAC if present, or simple role check)
-- NOTE: This is a stub that returns true. The real implementation is in 20261009000002_tenant_memberships.sql
create or replace function has_permission(p_permission text)
returns boolean as $$
  select true; -- override with real RBAC lookup in newer migration
$$ language sql stable;

-- Generic tenant_isolation policy template applied to all tables
-- Each table below gets: SELECT/INSERT/UPDATE/DELETE scoped to tenant_id

-- remocao
create policy "tenant_isolation_remocao_select" on remocao for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_insert" on remocao for insert with check (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_update" on remocao for update using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_delete" on remocao for delete using (tenant_id = get_tenant_id());

-- remocao_paciente
create policy "tenant_isolation_remocao_paciente_select" on remocao_paciente for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_paciente_insert" on remocao_paciente for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_paciente_update" on remocao_paciente for update using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_paciente_delete" on remocao_paciente for delete using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_equipe
create policy "tenant_isolation_remocao_equipe_select" on remocao_equipe for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_equipe_insert" on remocao_equipe for insert with check (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_equipe_update" on remocao_equipe for update using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_equipe_delete" on remocao_equipe for delete using (tenant_id = get_tenant_id());

-- remocao_equipe_membro
create policy "tenant_isolation_remocao_equipe_membro_select" on remocao_equipe_membro for select using (equipe_id in (select id from remocao_equipe where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_equipe_membro_insert" on remocao_equipe_membro for insert with check (equipe_id in (select id from remocao_equipe where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_equipe_membro_update" on remocao_equipe_membro for update using (equipe_id in (select id from remocao_equipe where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_equipe_membro_delete" on remocao_equipe_membro for delete using (equipe_id in (select id from remocao_equipe where tenant_id = get_tenant_id()));

-- remocao_veiculo
create policy "tenant_isolation_remocao_veiculo_select" on remocao_veiculo for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_veiculo_insert" on remocao_veiculo for insert with check (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_veiculo_update" on remocao_veiculo for update using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_veiculo_delete" on remocao_veiculo for delete using (tenant_id = get_tenant_id());

-- remocao_motorista
create policy "tenant_isolation_remocao_motorista_select" on remocao_motorista for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_insert" on remocao_motorista for insert with check (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_update" on remocao_motorista for update using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_delete" on remocao_motorista for delete using (tenant_id = get_tenant_id());

-- remocao_motorista_turno
create policy "tenant_isolation_remocao_motorista_turno_select" on remocao_motorista_turno for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_turno_insert" on remocao_motorista_turno for insert with check (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_turno_update" on remocao_motorista_turno for update using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_motorista_turno_delete" on remocao_motorista_turno for delete using (tenant_id = get_tenant_id());

-- remocao_avaliacao_clinica
create policy "tenant_isolation_remocao_avaliacao_select" on remocao_avaliacao_clinica for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_avaliacao_insert" on remocao_avaliacao_clinica for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_avaliacao_update" on remocao_avaliacao_clinica for update using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_avaliacao_delete" on remocao_avaliacao_clinica for delete using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_checklist
create policy "tenant_isolation_remocao_checklist_select" on remocao_checklist for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_checklist_insert" on remocao_checklist for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_checklist_update" on remocao_checklist for update using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_checklist_delete" on remocao_checklist for delete using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_destino_confirmacao
create policy "tenant_isolation_remocao_destino_conf_select" on remocao_destino_confirmacao for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_destino_conf_insert" on remocao_destino_confirmacao for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_checkin
create policy "tenant_isolation_remocao_checkin_select" on remocao_checkin for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_checkin_insert" on remocao_checkin for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_checkout
create policy "tenant_isolation_remocao_checkout_select" on remocao_checkout for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_checkout_insert" on remocao_checkout for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_intercorrencia
create policy "tenant_isolation_remocao_intercorrencia_select" on remocao_intercorrencia for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_intercorrencia_insert" on remocao_intercorrencia for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_intercorrencia_update" on remocao_intercorrencia for update using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_status_historico (read-only after creation)
create policy "tenant_isolation_remocao_status_hist_select" on remocao_status_historico for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_evento (read-only after creation)
create policy "tenant_isolation_remocao_evento_select" on remocao_evento for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_documento
create policy "tenant_isolation_remocao_documento_select" on remocao_documento for select using (tenant_id = get_tenant_id());
create policy "tenant_isolation_remocao_documento_insert" on remocao_documento for insert with check (tenant_id = get_tenant_id());

-- remocao_documento_extracao
create policy "tenant_isolation_remocao_doc_ext_select" on remocao_documento_extracao for select using (documento_id in (select id from remocao_documento where tenant_id = get_tenant_id()));

-- remocao_documento_conferencia
create policy "tenant_isolation_remocao_doc_conf_select" on remocao_documento_conferencia for select using (documento_id in (select id from remocao_documento where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_doc_conf_insert" on remocao_documento_conferencia for insert with check (documento_id in (select id from remocao_documento where tenant_id = get_tenant_id()));

-- remocao_rota
create policy "tenant_isolation_remocao_rota_select" on remocao_rota for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_rota_insert" on remocao_rota for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_gps_posicao
create policy "tenant_isolation_remocao_gps_select" on remocao_gps_posicao for select using (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));
create policy "tenant_isolation_remocao_gps_insert" on remocao_gps_posicao for insert with check (remocao_id in (select id from remocao where tenant_id = get_tenant_id()));

-- remocao_auditoria (read-only)
create policy "tenant_isolation_remocao_auditoria_select" on remocao_auditoria for select using (tenant_id = get_tenant_id());

-- remocao_tabela_referencia
create policy "tenant_isolation_remocao_ref_select" on remocao_tabela_referencia for select using (tenant_id = get_tenant_id());

-- remocao_unidade
create policy "tenant_isolation_remocao_unidade_select" on remocao_unidade for select using (tenant_id = get_tenant_id());

-- remocao_setor
create policy "tenant_isolation_remocao_setor_select" on remocao_setor for select using (tenant_id = get_tenant_id());

-- =============================================================================
-- Audit trigger: log every update to remocao as an event
-- =============================================================================

create or replace function remocao_audit_trigger()
returns trigger as $$
begin
  insert into remocao_status_historico (
    remocao_id, status_anterior, status_novo,
    criado_por, criado_por_nome
  ) values (
    NEW.id, OLD.status, NEW.status,
    auth.uid(), current_setting('request.person_nome', true)
  );
  insert into remocao_evento (
    remocao_id, evento, descricao, nivel,
    criado_por, criado_por_nome
  ) values (
    NEW.id, 'status_changed',
    format('Status alterado de %s para %s', OLD.status, NEW.status),
    'info',
    auth.uid(), current_setting('request.person_nome', true)
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger remocao_status_audit
  after update of status on remocao
  for each row execute function remocao_audit_trigger();
