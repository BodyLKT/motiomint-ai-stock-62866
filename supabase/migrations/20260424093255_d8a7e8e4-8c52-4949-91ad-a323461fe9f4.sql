
-- Add INSERT policy: users can only insert their own download rows
CREATE POLICY "Users can insert their own downloads"
ON public.user_downloads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Explicitly deny UPDATE/DELETE by adding restrictive-style no-op policies?
-- Postgres RLS denies by default when no policy exists, so no UPDATE/DELETE policy = denied.
-- The record_download() function is SECURITY DEFINER and bypasses RLS, so quota enforcement still works.
