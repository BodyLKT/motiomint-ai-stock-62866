-- Only admins can update thumbnails (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can update thumbnails' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Only admins can update thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''thumbnails'' AND public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Only admins can delete thumbnails (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can delete thumbnails' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Only admins can delete thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''thumbnails'' AND public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;