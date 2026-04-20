-- Fix #1: Remove duplicate {public}-role admin storage policies (keep {authenticated} variants)
DROP POLICY IF EXISTS "Admins can delete thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload thumbnails" ON storage.objects;

-- Fix #2: Restrict animation file reads to admins, active subscribers, or users with a recorded download
DROP POLICY IF EXISTS "Authenticated users can read animation files" ON storage.objects;

CREATE POLICY "Entitled users can read animation files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'animations'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.user_id = auth.uid()
        AND us.status = 'active'
        AND (us.end_date IS NULL OR us.end_date > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_downloads ud
      WHERE ud.user_id = auth.uid()
    )
  )
);