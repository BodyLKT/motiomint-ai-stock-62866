-- 1) Install missing trigger to auto-create a profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3) Harden record_download: ensure profile exists before inserting download row
CREATE OR REPLACE FUNCTION public.record_download(_animation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _limit integer;
  _used integer;
  _email text;
  _full_name text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Self-heal: ensure a profile row exists for this user (FK target for user_downloads.user_id)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    SELECT email, raw_user_meta_data->>'full_name'
      INTO _email, _full_name
    FROM auth.users WHERE id = _user_id;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (_user_id, _full_name, _email)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get current subscription limit (default free = 5)
  SELECT COALESCE(us.download_limit, 5)
  INTO _limit
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF _limit IS NULL THEN
    _limit := 5;
  END IF;

  SELECT COUNT(*)
  INTO _used
  FROM public.user_downloads ud
  WHERE ud.user_id = _user_id
    AND ud.downloaded_at >= date_trunc('month', now());

  IF _used >= _limit THEN
    RAISE EXCEPTION 'Download limit reached (% of %)', _used, _limit;
  END IF;

  INSERT INTO public.user_downloads (user_id, animation_id)
  VALUES (_user_id, _animation_id);

  UPDATE public.user_subscriptions
  SET downloads_used = COALESCE(downloads_used, 0) + 1, updated_at = now()
  WHERE user_id = _user_id AND status = 'active';
END;
$function$;