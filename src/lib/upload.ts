import { supabase, STORAGE_BUCKET } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class UploadError extends Error {}

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new UploadError('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError('Arquivo muito grande. Tamanho máximo: 5 MB.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new UploadError('Usuário não autenticado.');

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw new UploadError('Não foi possível enviar o arquivo.');
  return fileName;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteStorageFile(path: string): Promise<void> {
  if (!path || path.startsWith('http')) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) return;
}
