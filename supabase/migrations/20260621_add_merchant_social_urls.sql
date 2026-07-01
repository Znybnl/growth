alter table public.merchants
  add column if not exists facebook_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists tripadvisor_url text not null default '';
