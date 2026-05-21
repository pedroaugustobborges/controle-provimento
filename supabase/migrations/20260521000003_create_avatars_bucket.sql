-- Create public avatars bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "avatars_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update/replace their own avatars
CREATE POLICY "avatars_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "avatars_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read access (bucket is public so getPublicUrl works)
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
