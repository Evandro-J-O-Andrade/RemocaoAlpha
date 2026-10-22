-- =============================================================================
-- REMOÇÃO ALPHA — Computed Views (Corrected from 005)
-- =============================================================================
-- Purpose: Views for dashboard, summary, and checklist defaults
-- Key fix: All views use get_active_tenant_id() for tenant isolation
-- =============================================================================

-- =============================================================================
-- View: remocao_dashboard — full join for the Central de Remoções
-- =============================================================================
create or replace view remocao_dashboard as
select
  r.id,
  r.numero,
  r.titulo,
  r.tenant_id,
  r.paciente_nome,
  r.paciente_prontuario,
  r.paciente_condicao_clinica,
  r.origem_unidade_id,
  ou.nome as origem_unidade_nome,
  r.origem_setor_id,
  os.nome as origem_setor_nome,
  r.origem_leito,
  r.destino_unidade_id,
  du.nome as destino_unidade_nome,
  r.destino_setor_id,
  ds.nome as destino_setor_nome,
  r.destino_endereco,
  r.destino_confirmado_por,
  r.destino_confirmed_at,
  r.finalidade,
  r.tipo_transporte,
  r.nivel_suporte,
  r.prioridade,
  r.necessidade_medica,
  r.status,
  r.data_prevista,
  r.horario_previsto_saida,
  r.horario_previsto_atendimento,
  r.veiculo_id,
  rv.placa as veiculo_placa,
  rv.modelo as veiculo_modelo,
  rm.id as motorista_id,
  rm.profissional_nome as motorista_nome,
  case when rm.confirmado then 'confirmado' else 'pendente' end as motorista_status,
  r.created_at,
  r.updated_at,
  r.motivo_cancelamento,
  -- computed timers
  case
    when r.status = 'SOLICITADA' then now() - r.created_at
    when r.status = 'AGUARDANDO_MOTORISTA' then now() - r.updated_at
    else interval '0'
  end as tempo_espera,
  -- checklist completion percentage
  (
    select count(*) filter (where checked) * 100.0 / nullif(count(*), 0)
    from remocao_checklist c where c.remocao_id = r.id
  ) as checklist_pct
from remocao r
left join remocao_unidade ou on r.origem_unidade_id = ou.id
left join remocao_setor os on r.origem_setor_id = os.id
left join remocao_unidade du on r.destino_unidade_id = du.id
left join remocao_setor ds on r.destino_setor_id = ds.id
left join remocao_veiculo rv on r.veiculo_id = rv.id
left join lateral (
  select mem.id, mem.profissional_nome, mem.confirmado
  from remocao_equipe re
  join remocao_equipe_membro mem on mem.equipe_id = re.id and mem.role = 'motorista'
  where re.remocao_id = r.id
  order by mem.confirmado desc, mem.created_at desc
  limit 1
) rm on true
where r.tenant_id = get_active_tenant_id();

-- =============================================================================
-- View: remocao_summary — dashboard cards
-- =============================================================================
create or replace view remocao_summary as
select
  count(*) filter (where date_trunc('day', created_at) = date_trunc('day', now())) as total_programadas,
  count(*) filter (where status = 'AGUARDANDO_MOTORISTA') as aguardando_motorista,
  count(*) filter (where status = 'EM_DESLOCAMENTO') as em_deslocamento,
  count(*) filter (where prioridade = 'emergencial' and status not in ('ENCERRADA','CANCELADA')) as criticas,
  count(*) filter (where status = 'ENCERRADA' and date_trunc('day', created_at) = date_trunc('day', now())) as concluidas,
  count(*) filter (where status in ('SOLICITADA','EM_AVALIACAO','AGUARDANDO_DESTINO','DESTINO_CONFIRMADO','AGUARDANDO_EQUIPE','EQUIPE_CONFIRMADA','AGUARDANDO_MOTORISTA','MOTORISTA_CHECKIN','MOTORISTA_CONFIRMADO','CHECKLIST_PENDENTE','PRONTA_PARA_SAIDA')) as pendentes,
  count(*) filter (where status = 'INTERCORRENCIA') as intercorrencias
from remocao
where tenant_id = get_active_tenant_id();

-- =============================================================================
-- View: remocao_checklist_default — default template based on tipo_transporte
-- =============================================================================
create or replace view remocao_checklist_default as
select
  'identificacao' as secao,
  'paciente_identidade' as item_key,
  'Identidade do paciente conferida' as item_label,
  true as required,
  ARRAY['simple','basico','intermediario','avancado','urgente'] as tipos_aplicaveis
union all
select 'identificacao', 'paciente_pulseira', 'Pulseira conferida', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'identificacao', 'paciente_prontuario', 'Prontuário conferido', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'identificacao', 'destino_confirmado', 'Destino confirmado', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'condicao_clinica', 'sinais_vitais', 'Sinais vitais avaliados', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'condicao_clinica', 'condicao_transporte', 'Condição clínica compatível com transporte', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'condicao_clinica', 'oxigenio', 'Oxigênio conferido', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'condicao_clinica', 'acesso_venoso', 'Acesso venoso conferido', true, ARRAY['intermediario','avancado','urgente']
union all
select 'condicao_clinica', 'medicacoes', 'Medicações conferidas', true, ARRAY['avancado','urgente']
union all
select 'condicao_clinica', 'equipamentos', 'Equipamentos necessários disponíveis', true, ARRAY['intermediario','avancado','urgente']
union all
select 'documentacao', 'relatorio_medico', 'Relatório médico', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'documentacao', 'pedido_exame', 'Pedido de exame/procedimento', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'documentacao', 'documento_transferencia', 'Documento de transferência', true, ARRAY['intermediario','avancado']
union all
select 'documentacao', 'autorizacao', 'Autorização, quando aplicável', true, ARRAY['simple','basico','intermediario','avancado']
union all
select 'documentacao', 'docs_administrativos', 'Documentos administrativos', false, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'veiculo', 'veiculo_disponivel', 'Veículo disponível', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'veiculo', 'veiculo_adequado', 'Veículo adequado ao paciente', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'veiculo', 'equipamentos_veiculo', 'Equipamentos conferidos', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'veiculo', 'oxigenio_veiculo', 'Oxigênio conferido', true, ARRAY['basico','intermediario','avancado','urgente']
union all
select 'veiculo', 'comunicacao', 'Comunicação disponível', true, ARRAY['intermediario','avancado','urgente']
union all
select 'equipe', 'motorista', 'Motorista confirmado', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'equipe', 'tecnico', 'Técnico confirmado', true, ARRAY['simple','basico','intermediario','avancado','urgente']
union all
select 'equipe', 'enfermeiro', 'Enfermeiro confirmado (quando necessário)', true, ARRAY['intermediario','avancado','urgente']
union all
select 'equipe', 'medico', 'Médico confirmado (quando necessário)', true, ARRAY['avancado','urgente'];

-- =============================================================================
-- View: remocao_operacional — real-time operational view
-- =============================================================================
create or replace view remocao_operacional as
select
  r.id,
  r.numero,
  r.paciente_nome,
  r.paciente_condicao_clinica,
  r.finalidade,
  r.tipo_transporte,
  r.nivel_suporte,
  r.prioridade,
  r.status,
  r.origem_unidade_nome,
  r.destino_unidade_nome,
  r.horario_previsto_saida,
  r.veiculo_placa,
  r.motorista_nome,
  r.motorista_status,
  r.tempo_espera,
  r.checklist_pct,
  -- GPS last position
  gps.latitude as ultima_lat,
  gps.longitude as ultima_lng,
  gps.recorded_at as ultima_posicao_at,
  gps.accuracy as ultima_accuracy
from remocao_dashboard r
left join lateral (
  select latitude, longitude, recorded_at, accuracy
  from remocao_gps_posicao
  where remocao_id = r.id
  order by recorded_at desc
  limit 1
) gps on true
where r.status in ('EM_DESLOCAMENTO', 'CHEGADA_DESTINO', 'PACIENTE_ENTREGUE', 'RETORNANDO', 'PRONTA_PARA_SAIDA', 'AGUARDANDO_MOTORISTA', 'MOTORISTA_CHECKIN', 'MOTORISTA_CONFIRMADO', 'CHECKLIST_PENDENTE')
order by
  case r.prioridade when 'emergencial' then 0 when 'urgente' then 1 else 2 end,
  r.horario_previsto_saida asc nulls last;

-- =============================================================================
-- View: tenant_memberships_with_details — admin view of memberships
-- =============================================================================
create or replace view tenant_memberships_with_details as
select
  tm.id,
  tm.tenant_id,
  t.nome as tenant_nome,
  tm.person_id,
  p.nome as person_nome,
  p.email as person_email,
  tm.role_id,
  r.key as role_key,
  r.nome as role_nome,
  tm.status,
  tm.convidado_por,
  cp.nome as convidado_por_nome,
  tm.convidado_em,
  tm.aprovado_por,
  ap.nome as aprovado_por_nome,
  tm.aprovado_em,
  tm.expira_em,
  tm.created_at,
  tm.updated_at
from tenant_memberships tm
join tenants t on t.id = tm.tenant_id
join people p on p.id = tm.person_id
join roles r on r.id = tm.role_id
left join people cp on cp.id = tm.convidado_por
left join people ap on ap.id = tm.aprovado_por
where tm.tenant_id = get_active_tenant_id();

-- =============================================================================
-- Grant select on views
-- =============================================================================
grant select on remocao_dashboard to authenticated;
grant select on remocao_summary to authenticated;
grant select on remocao_checklist_default to authenticated;
grant select on remocao_operacional to authenticated;
grant select on tenant_memberships_with_details to authenticated;