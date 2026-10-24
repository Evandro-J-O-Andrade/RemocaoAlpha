-- Criar bucket para avatares de usuario
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politica de upload: usuario autenticado pode fazer upload do proprio avatar
CREATE POLICY avatars_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Politica de leitura: publico (bucket publico)
CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Politica de atualizacao: usuario pode atualizar o proprio avatar
CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Politica de exclusao: usuario pode excluir o proprio avatar
CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
