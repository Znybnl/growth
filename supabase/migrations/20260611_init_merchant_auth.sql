create table if not exists public.merchants (
  id text primary key,
  company_name text not null,
  logo_text text not null,
  logo_url text,
  city text,
  contact_name text,
  phone text,
  onboarding_completed boolean not null default false,
  preferred_goals text[] not null default '{}',
  diffusion_support text[] not null default '{}',
  google_review_url text not null default '',
  instagram_url text not null default '',
  default_prize_cost numeric(10, 2) not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists public.merchant_users (
  id text primary key,
  merchant_id text not null references public.merchants(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists merchant_users_merchant_id_idx on public.merchant_users (merchant_id);
create unique index if not exists merchant_users_email_lower_idx on public.merchant_users ((lower(email)));
