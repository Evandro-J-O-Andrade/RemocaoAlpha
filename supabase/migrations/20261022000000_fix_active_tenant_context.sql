-- Migration: corrigir o contexto de tenant ativo (recursão de RLS e persistência)
-- Data: 2026-10-22
-- Autor: Kilo
-- Status: DRAFT — exige autorização explícita antes de aplicar no banco remoto.
--
-- Diagnóstico (auditoria somente leitura em jqamhriokskinifjybfc):
--
-- 1) HTTP 500 (54001 "stack depth limit exceeded") em people, tenant_memberships,
--    remocao_unidade, remocao e mais 26 tabelas.
--    Causa: get_active_tenant_id() era SECURITY INVOKER e lia a tabela
--    tenant_memberships; a policy "tenant_memberships_select_tenant" chama
--    get_active_tenant_id() -> recursao infinita -> 500.
--    82 policies em 30 tabelas dependem dessa funcao.
--
-- 2) O contexto de tenant ativo nao sobrevivia entre requisicoes.
--    set_active_tenant() usava set_config('request.active_tenant_id', ..., true),
--    que e local a transacao. O PostgREST usa uma transacao por requisicao, logo
--    o GUC era descartado. O fallback (membership ativa) cobre o usuario comum,
--    mas o ROOT nao possui membership e ficava com get_active_tenant_id() = NULL:
--    trocava o tenant com sucesso e continuava vendo zero unidades/removecoes.
--
-- 3) O tenant real do RemocaoAlpha tem o id 00000000-0000-0000-0000-000000000001.
--    O frontend usava esse mesmo valor como "tenant sentinela" e bloqueava a
--    criacao de remocoes para 100% dos usuarios. A validacao correta e feita no
--    backend (get_current_tenant_info devolve o tenant resolvido via JOIN).

-- =============================================================================
-- 1. Contexto de tenant ativo persistido
-- =============================================================================

create table if not exists public.active_tenant_sessions (
  person_id uuid primary key references public.people(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  updated_at timestamp with time zone not null default now()
);

create index if not exists active_tenant_sessions_tenant_id_idx
  on public.active_tenant_sessions (tenant_id);

alter table public.active_tenant_sessions enable row level security;

drop policy if exists "active_tenant_sessions_select_own" on public.active_tenant_sessions;
create policy "active_tenant_sessions_select_own" on public.active_tenant_sessions
  for select using (person_id = auth.uid());

drop policy if exists "active_tenant_sessions_insert_own" on public.active_tenant_sessions;
create policy "active_tenant_sessions_insert_own" on public.active_tenant_sessions
  for insert with check (person_id = auth.uid());

drop policy if exists "active_tenant_sessions_update_own" on public.active_tenant_sessions;
create policy "active_tenant_sessions_update_own" on public.active_tenant_sessions
  for update using (person_id = auth.uid()) with check (person_id = auth.uid());

drop policy if exists "active_tenant_sessions_delete_own" on public.active_tenant_sessions;
create policy "active_tenant_sessions_delete_own" on public.active_tenant_sessions
  for delete using (person_id = auth.uid());

-- =============================================================================
-- 2. get_active_tenant_id(): SECURITY DEFINER, cast seguro e fallback persistido
-- =============================================================================
-- SECURITY DEFINER: as policies chamam esta funcao e ela le tenant_memberships.
--   Sem SECURITY DEFINER a RLS da tabela de memberships e reavaliada dentro da
--   funcao, e a policy que chama a funcao reentra -> recursao -> HTTP 500.
--   O isolamento por tenant continua garantido: todas as branches filtram por
--   auth.uid(), que nao depende de privilegio.

-- Conversao tolerante: um GUC de tenant nao-uuid (ou vazio) jamais pode
-- derrubar a requisicao. O planner eleva o cast para um InitPlan avaliado
-- antecipadamente, portanto um cast direto (''::uuid) estouraria com 22P02
-- mesmo dentro de um CASE nunca verdadeiro.
create or replace function public.safe_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $fn$
begin
  return p_text::uuid;
exception
  when others then
    return null;
end;
$fn$;

create or replace function public.get_active_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  with ctx as (
    select public.safe_uuid(current_setting('request.active_tenant_id', true)) as guc_tenant
  )
  select coalesce(
    -- (1) tenant ativo da transacao corrente
    case
      when ctx.guc_tenant is not null
        and exists (
          select 1
          from tenant_memberships tm
          where tm.person_id = auth.uid()
            and tm.tenant_id = ctx.guc_tenant
            and tm.status = 'ativo'
            and (tm.expira_em is null or tm.expira_em > now())
        )
      then ctx.guc_tenant
    end,

    -- (2) tenant ativo persistido pela troca de organizacao
    (
      select s.tenant_id
      from active_tenant_sessions s
      where s.person_id = auth.uid()
        and exists (
          select 1 from tenants t where t.id = s.tenant_id and t.ativo = true
        )
      limit 1
    ),

    -- (3) fallback: membership ativa mais recente
    (
      select tm.tenant_id
      from tenant_memberships tm
      where tm.person_id = auth.uid()
        and tm.status = 'ativo'
        and (tm.expira_em is null or tm.expira_em > now())
      order by tm.aprovado_em desc nulls last
      limit 1
    )
  )
  from ctx;
$fn$;

-- =============================================================================
-- 3. set_active_tenant(): persiste o contexto
-- =============================================================================
-- ROOT (admin_master) pode selecionar qualquer tenant existente.
-- Demais usuarios apenas tenants com membership ativa.

create or replace function public.set_active_tenant(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_membership tenant_memberships%rowtype;
begin
  if exists (
    select 1
    from root_privileges rp
    where rp.person_id = auth.uid()
      and rp.revoked_at is null
  ) then
    if not exists (select 1 from tenants where id = p_tenant_id) then
      raise exception 'Tenant not found: %', p_tenant_id
        using errcode = 'P0002';
    end if;
  else
    select * into v_membership
    from tenant_memberships tm
    where tm.person_id = auth.uid()
      and tm.tenant_id = p_tenant_id
      and tm.status = 'ativo'
      and (tm.expira_em is null or tm.expira_em > now());

    if not found then
      return false;
    end if;
  end if;

  perform set_config('request.active_tenant_id', p_tenant_id::text, true);

  insert into active_tenant_sessions (person_id, tenant_id, updated_at)
  values (auth.uid(), p_tenant_id, now())
  on conflict (person_id) do update
    set tenant_id = excluded.tenant_id,
        updated_at = now();

  return true;
end;
$fn$;

-- =============================================================================
-- 4. get_current_tenant_info(): tenant resolvido para ROOT e ordem de preferencia
-- =============================================================================

create or replace function public.get_current_tenant_info()
returns table(
  tenant_id uuid,
  tenant_nome text,
  person_id uuid,
  person_nome text,
  person_email text,
  papel text,
  is_root boolean
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  return query
  select
    t.id,
    t.nome,
    p.id,
    p.nome,
    p.email,
    coalesce(r.key, tm.papel),
    exists (
      select 1 from root_privileges rp
      where rp.person_id = auth.uid()
        and rp.revoked_at is null
    )
  from tenants t
  join tenant_memberships tm on tm.tenant_id = t.id
  join people p on p.id = tm.person_id
  left join roles r on r.id = tm.role_id
  where p.id = auth.uid()
    and (tm.status = 'ativo' or tm.status = 'pendente')
    and (tm.expira_em is null or tm.expira_em > now())
  order by (tm.tenant_id = get_active_tenant_id()) desc, t.created_at asc
  limit 1;

  -- Sem membership: ROOT global, usando o tenant ativo selecionado.
  if not found then
    return query
    select
      t.id,
      t.nome,
      p.id,
      p.nome,
      p.email,
      'admin_master'::text,
      true
    from people p
    left join tenants t on t.id = get_active_tenant_id()
    where p.id = auth.uid()
      and exists (
        select 1 from root_privileges rp
        where rp.person_id = auth.uid()
          and rp.revoked_at is null
      );
  end if;
end;
$fn$;

-- =============================================================================
-- 5. get_active_tenant(): mesma correcao de contexto
-- =============================================================================

create or replace function public.get_active_tenant()
returns tenants
language sql
stable
security definer
set search_path = public
as $fn$
  select * from tenants where id = get_active_tenant_id();
$fn$;

-- =============================================================================
-- 6. Hardening: search_path fixo nas demais funcoes de policy
-- =============================================================================

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    (select 1 from root_privileges rp
      where rp.person_id = auth.uid() and rp.revoked_at is null)
    union all
    select 1
    from tenant_memberships tm
    join role_permissions rp_perm on rp_perm.role_id = tm.role_id
    join permissions p on p.id = rp_perm.permission_id
    where tm.person_id = auth.uid()
      and tm.tenant_id = get_active_tenant_id()
      and tm.status = 'ativo'
      and (tm.expira_em is null or tm.expira_em > now())
      and p.key = p_permission
  ) as found;
$fn$;

create or replace function public.get_user_permissions()
returns table(permission_key text)
language sql
stable
security definer
set search_path = public
as $fn$
  select p.key::text
  from permissions p
  where exists (
    select 1 from root_privileges rp
    where rp.person_id = auth.uid()
      and rp.revoked_at is null
  )

  union all

  select p.key::text
  from tenant_memberships tm
  join role_permissions rp on rp.role_id = tm.role_id
  join permissions p on p.id = rp.permission_id
  where tm.person_id = auth.uid()
    and tm.tenant_id = get_active_tenant_id()
    and tm.status = 'ativo'
    and (tm.expira_em is null or tm.expira_em > now());
$fn$;
