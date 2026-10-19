-- =============================================================================
-- REMOÇÃO MODULE — Computed views & indexes
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
  ou_unit.nome as origem_unidade_nome,
  r.origem_setor_id,
  os_set.nome as origem_setor_nome,
  r.origem_leito,
  r.destino_unidade_id,
  du_unit.nome as destino_unidade_nome,
  r.destino_setor_id,
  ds_set.nome as destino_setor_nome,
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
  rm.id as motorista_id,
  rm.nome as motorista_nome,
  rm.status as motorista_status,
  r.created_at,
  r.updated_at,
  r.motivo_cancelamento,
  -- computed timers
  case
    when r.status = 'SOLICITADA' then now() - r.created_at
    when r.status = 'AGUARDANDO_MOTORISTA' then now() - r.updated_at
    else interval '0'
  end as tempo_espera,
  -- checklist completion
  (
    select count(*) filter (where checked) * 100.0 / nullif(count(*), 0)
    from remocao_checklist c where c.remocao_id = r.id
  ) as checklist_pct
from remocao r
left join remocao_unidade or_unit on r.origem_unidade_id = or_unit.id
left join remocao_setor os_set on r.origem_setor_id = os_set.id
left join remocao_unidade du_unit on r.destino_unidade_id = du_unit.id
left join remocao_setor ds_set on r.destino_setor_id = ds_set.id
left join remocao_veiculo rv on r.veiculo_id = rv.id
left join remocao_motorista rm on r.created_by = rm.id
where r.tenant_id = get_tenant_id();

-- =============================================================================
-- View: remocao_summary — dashboard cards (section 18)
-- =============================================================================
create or replace view remocao_summary as
select
  count(*) filter (where date_trunc('day', created_at) = date_trunc('day', now())) as total_programadas,
  count(*) filter (where status = 'AGUARDANDO_MOTORISTA') as aguardando_motorista,
  count(*) filter (where status = 'EM_DESLOCAMENTO') as em_deslocamento,
  count(*) filter (where prioridade = 'emergencial' and status not in ('ENCERRADA','CANCELADA')) as criticas,
  count(*) filter (where status = 'ENCERRADA' and date_trunc('day', encerrada_at) is not null
    and date_trunc('day', created_at) = date_trunc('day', now())) as concluidas,
  count(*) filter (where status in ('SOLICITADA','EM_AVALIACAO','AGUARDANDO_DESTINO','DESTINO_CONFIRMADO','AGUARDANDO_EQUIPE','EQUIPE_CONFIRMADA','AGUARDANDO_MOTORISTA','MOTORISTA_CHECKIN','MOTORISTA_CONFIRMADO','CHECKLIST_PENDENTE','PRONTA_PARA_SAIDA')) as pendentes,
  count(*) filter (where status = 'INTERCORRENCIA') as intercorrencias
from (
  select id, tenant_id, status, prioridade, created_at,
    (select max(created_at) from remocao_status_historico h where h.remocao_id = r.id and h.status_novo = 'ENCERRADA') as encerrada_at
  from remocao r
  where tenant_id = get_tenant_id()
) sub;

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
select 'veiculo', 'veiculo_adquado', 'Veículo adequado ao paciente', true, ARRAY['basico','intermediario','avancado','urgente']
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
-- Indexes for performance
-- =============================================================================
create index if not exists idx_remocao_tenant_status on remocao(tenant_id, status);
create index if not exists idx_remocao_tenant_created on remocao(tenant_id, created_at desc);
create index if not exists idx_remocao_status_historico_remocao on remocao_status_historico(remocao_id, created_at desc);
create index if not exists idx_remocao_evento_remocao on remocao_evento(remocao_id, created_at desc);
create index if not exists idx_remocao_documento_status on remocao_documento(tenant_id, status);
create index if not exists idx_remocao_gps_remocao_recorded on remocao_gps_posicao(remocao_id, recorded_at desc);
