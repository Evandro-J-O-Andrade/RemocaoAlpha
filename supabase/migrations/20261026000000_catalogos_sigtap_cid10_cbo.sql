-- Remoção Alpha — catálogos de referência clínica e faturamento
-- Tabelas globais de referência. Não inserir dados fictícios como catálogo oficial.
-- Os dados devem ser importados dos arquivos oficiais, com competência SIGTAP registrada.
-- Não cria organizations/profiles/patients/removal_requests: o projeto usa tenants/people/remocao.

create table if not exists public.cid10 (
  codigo text primary key,
  categoria text,
  subcategoria text,
  descricao text not null,
  descricao_resumida text,
  capitulo text,
  capitulo_codigo text,
  grupo text,
  fonte text not null default 'DATASUS/OMS',
  versao_fonte text,
  importado_em timestamptz not null default now(),
  constraint cid10_codigo_nao_vazio check (btrim(codigo) <> ''),
  constraint cid10_descricao_nao_vazia check (btrim(descricao) <> '')
);

create index if not exists idx_cid10_descricao_fts
  on public.cid10 using gin (to_tsvector('portuguese', descricao));
create index if not exists idx_cid10_categoria
  on public.cid10 (categoria);
create index if not exists idx_cid10_codigo_prefixo
  on public.cid10 (codigo text_pattern_ops);

create table if not exists public.cbo_ocupacoes (
  codigo text primary key,
  titulo text not null,
  titulo_resumido text,
  familia_codigo text,
  familia_titulo text,
  grande_grupo_codigo text,
  grande_grupo_titulo text,
  descricao text,
  fonte text not null default 'Ministério do Trabalho e Emprego — CBO',
  versao_fonte text,
  importado_em timestamptz not null default now(),
  constraint cbo_codigo_nao_vazio check (btrim(codigo) <> ''),
  constraint cbo_titulo_nao_vazio check (btrim(titulo) <> '')
);

create index if not exists idx_cbo_titulo_fts
  on public.cbo_ocupacoes using gin (to_tsvector('portuguese', titulo));
create index if not exists idx_cbo_familia
  on public.cbo_ocupacoes (familia_codigo);
create index if not exists idx_cbo_codigo_prefixo
  on public.cbo_ocupacoes (codigo text_pattern_ops);

-- A competência faz parte da identidade do registro: o mesmo código pode ter
-- valores/regras diferentes em competências mensais distintas.
create table if not exists public.sigtap_procedimentos (
  codigo text not null,
  competencia text not null,
  nome text not null,
  nome_resumido text,
  grupo_codigo text,
  grupo_nome text,
  subgrupo_codigo text,
  subgrupo_nome text,
  forma_organizacao_codigo text,
  forma_organizacao_nome text,
  valor_sh numeric(12,2) not null default 0,
  valor_sa numeric(12,2) not null default 0,
  valor_sp numeric(12,2) not null default 0,
  valor_total numeric(12,2) generated always as
    (coalesce(valor_sh, 0) + coalesce(valor_sa, 0) + coalesce(valor_sp, 0)) stored,
  idade_minima integer,
  idade_maxima integer,
  sexo_permitido text check (sexo_permitido in ('M', 'F', 'AMBOS')),
  fonte text not null default 'DATASUS/SIGTAP',
  importado_em timestamptz not null default now(),
  primary key (codigo, competencia),
  constraint sigtap_codigo_nao_vazio check (btrim(codigo) <> ''),
  constraint sigtap_competencia_formato check (competencia ~ '^[0-9]{6}$'),
  constraint sigtap_nome_nao_vazio check (btrim(nome) <> ''),
  constraint sigtap_valores_nao_negativos check (
    valor_sh >= 0 and valor_sa >= 0 and valor_sp >= 0
  ),
  constraint sigtap_faixa_etaria_valida check (
    idade_minima is null or idade_maxima is null or idade_minima <= idade_maxima
  )
);

create index if not exists idx_sigtap_nome_fts
  on public.sigtap_procedimentos using gin (to_tsvector('portuguese', nome));
create index if not exists idx_sigtap_grupo
  on public.sigtap_procedimentos (competencia, grupo_codigo, subgrupo_codigo);
create index if not exists idx_sigtap_codigo_competencia
  on public.sigtap_procedimentos (codigo, competencia desc);

-- RLS: catálogos são dados de referência globais, consultáveis por usuários
-- autenticados de qualquer tenant. Não há políticas de escrita para clientes;
-- carga/atualização deve ser feita por migração ou processo de importação confiável.
alter table public.cid10 enable row level security;
alter table public.cbo_ocupacoes enable row level security;
alter table public.sigtap_procedimentos enable row level security;

drop policy if exists cid10_select_authenticated on public.cid10;
create policy cid10_select_authenticated
  on public.cid10 for select to authenticated
  using (auth.uid() is not null);

drop policy if exists cbo_ocupacoes_select_authenticated on public.cbo_ocupacoes;
create policy cbo_ocupacoes_select_authenticated
  on public.cbo_ocupacoes for select to authenticated
  using (auth.uid() is not null);

drop policy if exists sigtap_procedimentos_select_authenticated on public.sigtap_procedimentos;
create policy sigtap_procedimentos_select_authenticated
  on public.sigtap_procedimentos for select to authenticated
  using (auth.uid() is not null);

revoke all on public.cid10, public.cbo_ocupacoes, public.sigtap_procedimentos from anon;
grant select on public.cid10, public.cbo_ocupacoes, public.sigtap_procedimentos to authenticated;

comment on table public.cid10 is
  'Catálogo CID-10 importado de fonte oficial; não contém dados de pacientes.';
comment on table public.cbo_ocupacoes is
  'Catálogo nacional de ocupações CBO; não substitui validação de registro profissional.';
comment on table public.sigtap_procedimentos is
  'Catálogo SIGTAP versionado por competência mensal; valores não incluem regras contratuais locais.';
