/*
# Tornar o bucket vehicle-photos privado e seguro

## Objetivo
Converter o bucket "vehicle-photos" de público para privado, e substituir
as políticas de storage atuais (que permitem acesso anônimo irrestrito)
por políticas que exigem autenticação e posse do arquivo.

## Mudanças
1. Bucket
   - `vehicle-photos` passa de `public = true` para `public = false`.
   - Nenhum arquivo existente é apagado.

2. Políticas de Storage (storage.objects)
   - Remover as 3 políticas atuais (anon_read, anon_upload, anon_delete).
   - Criar 4 novas políticas para o bucket vehicle-photos:
     - SELECT: usuários autenticados só podem ler objetos cujo caminho
       começa com o próprio user_id (ex.: "{user_id}/vehicles/...").
     - INSERT: usuários autenticados só podem enviar arquivos cujo caminho
       começa com o próprio user_id.
     - UPDATE: idem.
     - DELETE: idem.
   - O papel `anon` não recebe nenhuma política — acesso negado por padrão.

## Notas importantes
- As imagens existentes NÃO são apagadas.
- Após esta migração, as URLs públicas deixarão de funcionar. O frontend
  passará a usar URLs assinadas (createSignedUrl) para exibir as imagens.
- Os uploads existentes que não seguem o padrão "{user_id}/..." continuarão
  no bucket mas não serão acessíveis pelas novas políticas. Isso é aceitável
  pois eram de antes da autenticação.
- Para que os novos uploads sejam acessíveis, o frontend deve usar o caminho
  "{user_id}/vehicles/..." e "{user_id}/receipts/..." ao fazer upload.
*/

-- 1. Tornar o bucket privado
UPDATE storage.buckets
SET public = false
WHERE name = 'vehicle-photos';

-- 2. Remover políticas antigas de storage
DROP POLICY IF EXISTS "anon_read_vehicle_photos" ON storage.objects;
DROP POLICY IF EXISTS "anon_upload_vehicle_photos" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_vehicle_photos" ON storage.objects;

-- 3. Criar novas políticas (apenas authenticated, escopadas por user_id no caminho)

-- SELECT: ler apenas seus próprios arquivos
DROP POLICY IF EXISTS "storage_read_own_vehicle_photos" ON storage.objects;
CREATE POLICY "storage_read_own_vehicle_photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT: enviar apenas para sua própria pasta
DROP POLICY IF EXISTS "storage_insert_own_vehicle_photos" ON storage.objects;
CREATE POLICY "storage_insert_own_vehicle_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: renomear/mover apenas seus próprios arquivos
DROP POLICY IF EXISTS "storage_update_own_vehicle_photos" ON storage.objects;
CREATE POLICY "storage_update_own_vehicle_photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: excluir apenas seus próprios arquivos
DROP POLICY IF EXISTS "storage_delete_own_vehicle_photos" ON storage.objects;
CREATE POLICY "storage_delete_own_vehicle_photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
