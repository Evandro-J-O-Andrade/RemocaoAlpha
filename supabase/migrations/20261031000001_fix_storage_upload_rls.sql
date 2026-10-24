-- Migration: Corrigir política de upload no Storage para remocao-documentos
-- Data: 2026-10-30
-- Problema: A política remocao_documentos_upload exigia que o registro em remocao_documento
-- já existisse com storage_path = objects.name ANTES do upload, mas o código faz upload primeiro
-- e insere metadados depois. Isso causava "new row violates row-level security policy".
-- Solução: Validar tenant e permissão pelo caminho do arquivo ({tenantId}/{remocaoId}/...),
-- sem exigir que o metadado já exista. A tabela remocao_documento continua validando tenant e permissão.

-- Remover política antiga
DROP POLICY IF EXISTS remocao_documentos_upload ON storage.objects;

-- Nova política: valida bucket, tenant pelo primeiro segmento do caminho e permissão
CREATE POLICY remocao_documentos_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'remocao-documentos'
    AND (storage.foldername(name))[1] = get_active_tenant_id()::text
    AND has_permission('remocao.documento.upload')
  );
