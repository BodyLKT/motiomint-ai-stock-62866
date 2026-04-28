-- Remove Glass Mesh Ribbon Flow animations and any related user references
DELETE FROM public.user_favorites WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE 'Glass Mesh Ribbon Flow%'
);
DELETE FROM public.user_cart WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE 'Glass Mesh Ribbon Flow%'
);
DELETE FROM public.user_downloads WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE 'Glass Mesh Ribbon Flow%'
);
DELETE FROM public.animation_tags WHERE animation_id IN (
  SELECT id FROM public.animations WHERE title ILIKE 'Glass Mesh Ribbon Flow%'
);
DELETE FROM public.animations WHERE title ILIKE 'Glass Mesh Ribbon Flow%';