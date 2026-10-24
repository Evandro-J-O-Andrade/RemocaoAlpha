-- Migration: Módulo Profissional — Tabelas de qualificação, vínculos e documentos
-- Data: 2026-10-30
-- Objetivo: Criar estrutura para gestão profissional completa, separada de people
-- Status: PENDENTE DE APLICAÇÃO (auditoria concluída, aguardando autorização)

-- 1. Tabela profissional (situação profissional geral)
CREATE TABLE IF NOT EXISTS public.profissional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  tipo_profissional text NOT NULL, -- motorista, enfermeiro, medico, tecnico_enfermagem, outro
  situacao text NOT NULL DEFAULT 'ativo', -- ativo, inativo, licenca, desligado
  data_admissao date,
  data_desligamento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_profissional_tenant ON public.profissional(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_pessoa ON public.profissional(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_profissional_tipo ON public.profissional(tenant_id, tipo_profissional);

-- 2. Tabela profissional_registro (CRM, COREN, etc.)
CREATE TABLE IF NOT EXISTS public.profissional_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,
  tipo_registro text NOT NULL, -- crm, coren, cnh, cbo, outro
  numero text NOT NULL,
  uf text,
  categoria text,
  data_emissao date,
  data_validade date,
  situacao text NOT NULL DEFAULT 'valido', -- valido, vencido, suspenso, cancelado
  orgao_emissor text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, profissional_id, tipo_registro, numero)
);

CREATE INDEX IF NOT EXISTS idx_profissional_registro_tenant ON public.profissional_registro(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_registro_profissional ON public.profissional_registro(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_registro_validade ON public.profissional_registro(data_validade);

-- 3. Tabela profissional_qualificacao (especialidades)
CREATE TABLE IF NOT EXISTS public.profissional_qualificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,
  especialidade text NOT NULL,
  cbo_codigo text,
  data_obtencao date,
  situacao text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profissional_qualificacao_tenant ON public.profissional_qualificacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_qualificacao_profissional ON public.profissional_qualificacao(profissional_id);

-- 4. Tabela profissional_unidade (many-to-many)
CREATE TABLE IF NOT EXISTS public.profissional_unidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES public.remocao_unidade(id) ON DELETE CASCADE,
  funcao text NOT NULL, -- motorista, enfermeiro, medico, tecnico, administrativo
  situacao text NOT NULL DEFAULT 'ativo', -- ativo, inativo, licenca
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  elegivel_escala boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, profissional_id, unidade_id, funcao)
);

CREATE INDEX IF NOT EXISTS idx_profissional_unidade_tenant ON public.profissional_unidade(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_unidade_profissional ON public.profissional_unidade(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_unidade_unidade ON public.profissional_unidade(unidade_id);
CREATE INDEX IF NOT EXISTS idx_profissional_unidade_situacao ON public.profissional_unidade(tenant_id, situacao);

-- 5. Tabela profissional_documento (metadados de documentos)
CREATE TABLE IF NOT EXISTS public.profissional_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL, -- cnh, crm, coren, diploma, certificado, outro
  titulo text NOT NULL,
  storage_path text,
  storage_bucket text,
  mime_type text,
  file_size integer,
  data_emissao date,
  data_validade date,
  situacao text NOT NULL DEFAULT 'valido', -- valido, vencido, pendente, rejeitado
  observacoes text,
  enviado_por uuid REFERENCES auth.users(id),
  enviado_por_nome text,
  enviado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profissional_documento_tenant ON public.profissional_documento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_documento_profissional ON public.profissional_documento(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_documento_validade ON public.profissional_documento(data_validade);

-- 6. Tabela profissional_escala (escala/disponibilidade)
CREATE TABLE IF NOT EXISTS public.profissional_escala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissional(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES public.remocao_unidade(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time,
  tipo text NOT NULL DEFAULT 'plantao', -- plantao, sobreaviso, folga
  situacao text NOT NULL DEFAULT 'confirmado', -- confirmado, pendente, cancelado
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, profissional_id, unidade_id, data, hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_profissional_escala_tenant ON public.profissional_escala(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profissional_escala_profissional ON public.profissional_escala(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_escala_unidade_data ON public.profissional_escala(unidade_id, data);

-- 7. RLS para todas as tabelas
ALTER TABLE public.profissional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_qualificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_escala ENABLE ROW LEVEL SECURITY;

-- Policies (select/insert/update/delete por tenant)
CREATE POLICY profissional_select ON public.profissional FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_insert ON public.profissional FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_update ON public.profissional FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_delete ON public.profissional FOR DELETE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY profissional_registro_select ON public.profissional_registro FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_registro_insert ON public.profissional_registro FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_registro_update ON public.profissional_registro FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_registro_delete ON public.profissional_registro FOR DELETE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY profissional_qualificacao_select ON public.profissional_qualificacao FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_qualificacao_insert ON public.profissional_qualificacao FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_qualificacao_update ON public.profissional_qualificacao FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_qualificacao_delete ON public.profissional_qualificacao FOR DELETE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY profissional_unidade_select ON public.profissional_unidade FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_unidade_insert ON public.profissional_unidade FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_unidade_update ON public.profissional_unidade FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_unidade_delete ON public.profissional_unidade FOR DELETE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY profissional_documento_select ON public.profissional_documento FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_documento_insert ON public.profissional_documento FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_documento_update ON public.profissional_documento FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_documento_delete ON public.profissional_documento FOR DELETE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY profissional_escala_select ON public.profissional_escala FOR SELECT USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_escala_insert ON public.profissional_escala FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_escala_update ON public.profissional_escala FOR UPDATE USING (tenant_id = public.get_active_tenant_id());
CREATE POLICY profissional_escala_delete ON public.profissional_escala FOR DELETE USING (tenant_id = public.get_active_tenant_id());

-- 8. Grants
REVOKE ALL ON public.profissional FROM PUBLIC, anon;
REVOKE ALL ON public.profissional_registro FROM PUBLIC, anon;
REVOKE ALL ON public.profissional_qualificacao FROM PUBLIC, anon;
REVOKE ALL ON public.profissional_unidade FROM PUBLIC, anon;
REVOKE ALL ON public.profissional_documento FROM PUBLIC, anon;
REVOKE ALL ON public.profissional_escala FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional_registro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional_qualificacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional_unidade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional_documento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissional_escala TO authenticated;

GRANT ALL ON public.profissional TO service_role;
GRANT ALL ON public.profissional_registro TO service_role;
GRANT ALL ON public.profissional_qualificacao TO service_role;
GRANT ALL ON public.profissional_unidade TO service_role;
GRANT ALL ON public.profissional_documento TO service_role;
GRANT ALL ON public.profissional_escala TO service_role;

-- 9. FK em remocao_equipe_membro.profissional_id -> people.id
ALTER TABLE public.remocao_equipe_membro
  ADD CONSTRAINT fk_equipe_membro_profissional
  FOREIGN KEY (profissional_id) REFERENCES public.people(id)
  ON DELETE RESTRICT;
