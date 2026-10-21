-- Migration: corrigir o trigger que cria o checklist padrao da remocao
-- Data: 2026-10-23
-- Autor: Kilo
-- Status: DRAFT — validado em transacao rollbackada; aplicacao depende de
--          autorizacao explicita.
--
-- Diagnostico (auditoria do caminho de criacao de remocao em
-- jqamhriokskinifjybfc):
--
--   INSERT INTO remocao ... falhava com:
--     55000 record "v_template" is not assigned yet
--
--   Causa: em PL/pgSQL, a variavel do FOR e atribuidor somente depois que a
--   consulta do laco retorna as linhas. A funcao referenciava v_template
--   dentro da propria consulta que preenche o laco:
--
--     for v_template in
--       select secao, item_key, item_label
--       from remocao_checklist_default
--       where new.tipo_transporte is null
--          or v_template.tipos_aplicaveis @> ARRAY[new.tipo_transporte::text]
--     loop
--
--   Como remocao_checklist_default e uma view com 24 linhas, o trigger falhava
--   em TODA insercao em remocao — ou seja, o formulario de Nova Remocao nunca
--   conseguiria persistir uma remocao, mesmo com o contexto de tenant e as
--   policies ja corrigidos.
--
-- Correcao: usar um alias da view (d) no filtro, mantendo a semetrica
--   - tipo_transporte nulo  -> todos os itens do template
--   - tipo_transporte definido -> apenas itens aplicaveis a esse tipo
--
-- A secao da view e text e a coluna de remocao_checklist e o enum
-- remocao_checklist_secao: o cast precisa ser explicito. Itens com secao fora
-- do enum sao ignorados, para que um template inconsistente nunca impeca a
-- criacao de uma remocao.
--
-- O unique (remocao_id, secao, item_key) ja existe, portanto o ON CONFLICT
-- permanece valido. O enum remocao_checklist_secao possui exatamente as cinco
-- secoes usadas pela view.

create or replace function public.create_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_template record;
begin
  for v_template in
    select
      d.secao::remocao_checklist_secao as secao,
      d.item_key,
      d.item_label
    from remocao_checklist_default d
    where (new.tipo_transporte is null
           or d.tipos_aplicaveis @> array[new.tipo_transporte::text])
      and exists (
        select 1
        from pg_enum e
        where e.enumtypid = 'public.remocao_checklist_secao'::regtype
          and e.enumlabel = d.secao
      )
  loop
    insert into remocao_checklist (remocao_id, secao, item_key, item_label)
    values (new.id, v_template.secao, v_template.item_key, v_template.item_label)
    on conflict (remocao_id, secao, item_key) do nothing;
  end loop;
  return new;
end;
$fn$;
