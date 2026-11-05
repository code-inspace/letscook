-- Recipe photos move out of the recipe rows (base64) into Supabase Storage.
-- Public read (photos are shown with a plain <img> and cached by the service
-- worker); each user can only write in their own folder "<user id>/…".

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-images', 'recipe-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Recipe images: users read own folder" ON storage.objects;
CREATE POLICY "Recipe images: users read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Recipe images: users upload to own folder" ON storage.objects;
CREATE POLICY "Recipe images: users upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Recipe images: users update own folder" ON storage.objects;
CREATE POLICY "Recipe images: users update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Recipe images: users delete own folder" ON storage.objects;
CREATE POLICY "Recipe images: users delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
