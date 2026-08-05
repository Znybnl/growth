create table if not exists public.background_assets (
  id text primary key,
  label text not null,
  category text not null default 'General',
  image_url text not null,
  thumbnail_url text not null,
  storage_path text not null,
  thumbnail_storage_path text not null,
  width integer,
  height integer,
  created_by_user_id text references public.merchant_users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists background_assets_created_at_idx
  on public.background_assets (created_at desc);

comment on table public.background_assets is 'Bibliothèque d images de fond pour les pages de jeu.';
