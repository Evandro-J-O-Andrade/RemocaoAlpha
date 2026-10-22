ALTER TABLE public.remocao ADD COLUMN IF NOT EXISTS destino_externo_id uuid REFERENCES public.remocao_destinos_externos(id);
CREATE INDEX IF NOT EXISTS idx_remocao_destino_externo ON public.remocao(destino_externo_id);
