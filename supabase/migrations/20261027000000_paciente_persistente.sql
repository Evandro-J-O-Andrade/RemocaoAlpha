-- Remoção Alpha — cadastro persistente de pacientes
-- Cria a tabela `paciente` com identidade estável, separada de `people` (profissionais do sistema).
-- Não insere dados fictícios. Não altera tabelas existentes de forma destrutiva.
-- O vínculo com `remocao` é feito por nova coluna `paciente_cadastro_id`, mantendo
-- a coluna existente `paciente_id bigint` para referência externa (GPAT, CMDPro, etc.).

create table if not exists public.paciente (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id) not null,
  nome text not null,
  data_nascimento date,
  sexo text,
  cpf text,
  telefone text,
  email text,
  prontuario text,
  gpat text,
  cns text,
  cmdpro text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint paciente_nome_nao_vazio check (btrim(nome) <> ''),
  constraint paciente_cpf_unico_por_tenant unique (tenant_id, cpf) where cpf is not null
);

create index if not exists idx_paciente_tenant_nome on public.paciente (tenant_id, nome);
create index if not exists idx_paciente_tenant_cpf on public.paciente (tenant_id, cpf) where cpf is not null;
create index if not exists idx_paciente_prontuario on public.paciente (prontuario) where prontuario is not null;
create index if not exists idx_paciente_gpat on public.paciente (gpat) where gpat is not null;
create index if not exists idx_paciente_cns on public.paciente (cns) where cns is not null;
create index if not exists idx_paciente_cmdpro on public.paciente (cmdpro) where cmdpro is not null;

-- Coluna de vínculo na remocao, separada da referencia externa existente (paciente_id bigint).
alter table public.remocao
  add column if not exists paciente_cadastro_id uuid references public.paciente(id);

create index if not exists idx_remocao_paciente_cadastro on public.remocao (paciente_cadastro_id);

-- RLS: paciente tem isolamento por tenant, visível apenas para usuários autenticados do mesmo tenant.
alter table public.paciente enable row level security;

drop policy if exists paciente_select_tenant on public.paciente;
create policy paciente_select_tenant
  on public.paciente for select to authenticated
  using (tenant_id = (select get_active_tenant_id()));

drop policy if exists paciente_insert_tenant on public.paciente;
create policy paciente_insert_tenant
  on public.paciente for insert to authenticated
  with check (tenant_id = (select get_active_tenant_id()));

drop policy if exists paciente_update_tenant on public.paciente;
create policy paciente_update_tenant
  on public.paciente for update to authenticated
  using (tenant_id = (select get_active_tenant_id()))
  with check (tenant_id = (select get_active_tenant_id()));

drop policy if exists paciente_delete_tenant on public.paciente;
create policy paciente_delete_tenant
  on public.paciente for delete to authenticated
  using (tenant_id = (select get_active_tenant_id()));

grant select, insert, update, delete on public.paciente to authenticated;

comment on table public.paciente is 'Cadastro persistente de pacientes do Remoção Alpha. Identidade estável, não recriada a cada remoção.';
comment on column public.paciente.gpat is 'Identificador GPAT do sistema hospitalar de origem, quando disponível.';
comment on column public.paciente.cmdpro is 'Identificador CMDPro, quando disponível.';
comment on column public.paciente.cns is 'Cartão Nacional de Saúde, quando disponível.';
comment on column public.paciente.prontuario is 'Número de prontuário hospitalar, quando disponível.';
comment on column public.remocao.paciente_cadastro_id is 'Vínculo com o cadastro persistente de paciente. Separado da referencia externa paciente_id (bigint).';
