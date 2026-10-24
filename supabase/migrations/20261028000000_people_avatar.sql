-- Adicionar coluna avatar_url na tabela people para suporte a upload de avatar
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.people.avatar_url IS 'URL do avatar do usuario, armazenado no Supabase Storage.';
