-- Tighten animations bucket read policy: remove perpetual access via download history.
-- Access is now granted only to admins or users with an active, unexpired subscription.
DROP POLICY IF EXISTS "Entitled users can read animation files" ON storage.objects;

CREATE POLICY "Entitled users can read animation files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'animations'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.user_id = auth.uid()
        AND us.status = 'active'
        AND (us.end_date IS NULL OR us.end_date > now())
    )
  )
);