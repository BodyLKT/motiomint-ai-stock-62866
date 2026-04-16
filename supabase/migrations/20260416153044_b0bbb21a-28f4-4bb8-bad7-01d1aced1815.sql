-- 1. Make animations bucket private
UPDATE storage.buckets SET public = false WHERE id = 'animations';

-- 2. Add RLS policies on storage.objects for animations bucket
-- Authenticated users can read animation files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read animation files' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read animation files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''animations'')';
  END IF;
END $$;

-- Only admins can upload animation files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can upload animation files' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Only admins can upload animation files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''animations'' AND public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Only admins can update animation files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can update animation files' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Only admins can update animation files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''animations'' AND public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Only admins can delete animation files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can delete animation files' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Only admins can delete animation files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''animations'' AND public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- 3. Tighten profiles INSERT policy to validate email matches auth user
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id AND email = auth.email());