DELETE FROM public.animation_tags WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE '%Synthetic Human Glass Bust%'
);
DELETE FROM public.user_favorites WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE '%Synthetic Human Glass Bust%'
);
DELETE FROM public.user_cart WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE '%Synthetic Human Glass Bust%'
);
DELETE FROM public.user_downloads WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE '%Synthetic Human Glass Bust%'
);
DELETE FROM public.animations WHERE title ILIKE '%Synthetic Human Glass Bust%';