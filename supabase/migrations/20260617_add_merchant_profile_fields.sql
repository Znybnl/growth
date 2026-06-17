alter table public.merchants
  add column if not exists industry text,
  add column if not exists website_url text;
