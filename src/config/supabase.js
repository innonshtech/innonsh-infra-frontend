import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Uploads a file to a Supabase Storage Bucket and returns its public URL.
 * @param {File} file - The file object from input.
 * @param {string} bucketName - Name of the bucket (must be public).
 * @returns {Promise<string>} The public URL of the uploaded asset.
 */
export async function uploadFile(file, bucketName = 'innonsh-assets') {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }

  const fileExt = file.name.split('.').pop();
  // Generate a clean unique name
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `uploads/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrl;
}
