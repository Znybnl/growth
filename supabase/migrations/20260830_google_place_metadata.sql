alter table public.merchants
  add column if not exists google_place_name text,
  add column if not exists google_place_address text,
  add column if not exists google_place_rating numeric(2, 1),
  add column if not exists google_place_review_count integer;

comment on column public.merchants.google_place_name is 'Libellé du résultat Google sélectionné pour le lien d’avis.';
comment on column public.merchants.google_place_address is 'Adresse du résultat Google sélectionné pour le lien d’avis.';
comment on column public.merchants.google_place_rating is 'Note Google du résultat sélectionné, de 0 à 5.';
comment on column public.merchants.google_place_review_count is 'Nombre d’avis Google du résultat sélectionné.';
