alter table public.merchants
  add column if not exists custom_url text;

comment on column public.merchants.custom_url
  is 'Lien personnalise propose par defaut dans les actions marketing.';
