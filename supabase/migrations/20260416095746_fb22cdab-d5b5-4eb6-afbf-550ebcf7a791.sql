-- Create a secure RPC to get file_url only for authenticated users
CREATE OR REPLACE FUNCTION public.get_animation_file_url(_animation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT file_url INTO _url
  FROM public.animations
  WHERE id = _animation_id;

  IF _url IS NULL THEN
    RAISE EXCEPTION 'Animation not found';
  END IF;

  RETURN _url;
END;
$$;