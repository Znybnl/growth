create table if not exists public.preview_participations (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  session_id text not null,
  first_name text not null,
  email text not null,
  marketing_consent boolean not null default false,
  prize_id text references public.prizes(id) on delete set null,
  status text not null check (status in ('claimed', 'redeemed', 'expired', 'lost')),
  created_at timestamptz not null default timezone('utc', now()),
  redemption_code text,
  reward_available_at timestamptz,
  reward_expires_at timestamptz,
  redeemed_at timestamptz,
  purchase_verified boolean not null default false
);

create unique index if not exists preview_participations_redemption_code_idx
  on public.preview_participations (redemption_code)
  where redemption_code is not null;

create index if not exists preview_participations_campaign_created_idx
  on public.preview_participations (campaign_id, created_at desc);

revoke all on table public.preview_participations from anon, authenticated;
grant all on table public.preview_participations to service_role;
alter table public.preview_participations enable row level security;

comment on table public.preview_participations is
  'Participations de prévisualisation isolées des leads et statistiques réelles.';
