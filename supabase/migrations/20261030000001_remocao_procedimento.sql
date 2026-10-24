-- Migration: Criar tabela de relacionamento remocao_procedimento
-- Data: 2026-10-30
-- Objetivo: Persistir vínculos entre remoção e procedimentos/exames (SIGTAP, CID-10, CBO)
-- de forma estruturada, permitindo múltiplos procedimentos por remoção e rastreabilidade
-- para relatórios assistenciais e operacionais.

-- 1. Tabela de relacionamento
CREATE TABLE IF NOT EXISTS public.remocao_procedimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  remocao_id uuid NOT NULL REFERENCES public.remocao(id) ON DELETE CASCADE,
  sigtap_codigo text,
  sigtap_nome text,
  sigtap_valor_total numeric,
  sigtap_competencia text,
  cid10_codigo text,
  cid10_descricao text,
  cbo_codigo text,
  cbo_titulo text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_remocao_procedimento_tenant ON public.remocao_procedimento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remocao_procedimento_remocao ON public.remocao_procedimento(remocao_id);
CREATE INDEX IF NOT EXISTS idx_remocao_procedimento_sigtap ON public.remocao_procedimento(sigtap_codigo);

-- 3. RLS
ALTER TABLE public.remocao_procedimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY remocao_procedimento_select ON public.remocao_procedimento
  FOR SELECT USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY remocao_procedimento_insert ON public.remocao_procedimento
  FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY remocao_procedimento_update ON public.remocao_procedimento
  FOR UPDATE USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY remocao_procedimento_delete ON public.remocao_procedimento
  FOR DELETE USING (tenant_id = public.get_active_tenant_id());

-- 4. Grants
REVOKE ALL ON public.remocao_procedimento FROM PUBLIC;
REVOKE ALL ON public.remocao_procedimento FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remocao_procedimento TO authenticated;
GRANT ALL ON public.remocao_procedimento TO service_role;
