-- Destinos externos (hospitais/clinicas fora da rede)
CREATE TABLE IF NOT EXISTS public.remocao_destinos_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'hospital',
  endereco text,
  cidade text,
  uf text,
  cep text,
  telefone text,
  contato_nome text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remocao_destinos_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY remocao_destinos_externos_select ON public.remocao_destinos_externos
  FOR SELECT USING (tenant_id = public.get_active_tenant_id());

CREATE POLICY remocao_destinos_externos_insert ON public.remocao_destinos_externos
  FOR INSERT WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY remocao_destinos_externos_update ON public.remocao_destinos_externos
  FOR UPDATE USING (tenant_id = public.get_active_tenant_id());

CREATE INDEX IF NOT EXISTS idx_remocao_destinos_externos_tenant ON public.remocao_destinos_externos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remocao_destinos_externos_nome ON public.remocao_destinos_externos(tenant_id, nome);
