begin;

create extension if not exists pgcrypto;

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
  facebook_url text not null default '',
  tiktok_url text not null default '',
  tripadvisor_url text not null default '',
  custom_url text not null default '',
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

create table if not exists public.campaigns (
  id text primary key,
  merchant_id text not null references public.merchants(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  goal_type text not null check (goal_type in ('lead_capture', 'review_prompt', 'social_follow')),
  cta_label text not null,
  success_metric text not null,
  target_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  accent_ink text not null,
  accent_paper text not null,
  accent_signal text not null,

  game_type text not null check (game_type in ('wheel', 'scratch')),
  logo_url text,

  logo_size_percent integer not null default 100,
  logo_margin_bottom_px integer not null default 20,
  logo_align text not null default 'center' check (logo_align in ('left', 'center', 'right')),

  background_mode text not null default 'color' check (background_mode in ('color', 'image')),
  background_color text not null default '#111827',
  background_image_url text,

  heading_text_color text not null default '#ffffff',
  heading_font_size_px integer not null default 42,
  heading_font_family text not null default 'display' check (heading_font_family in ('display', 'sans', 'serif')),
  heading_align text not null default 'center' check (heading_align in ('left', 'center', 'right')),

  button_background_color text not null default '#2f6df6',
  button_text_color text not null default '#ffffff',
  button_border_color text not null default '#2f6df6',
  button_size text not null default 'md' check (button_size in ('sm', 'md', 'lg')),
  button_text_size_px integer not null default 18,

  wheel_rim_color text not null default '#f4c14a',
  wheel_win_color text not null default '#f4c14a',
  wheel_alternate_win_color text not null default '#eef2ff',
  wheel_lose_color text not null default '#1b2842',
  wheel_alternate_lose_color text not null default '#8795db',

  reward_expiry_minutes integer not null default 20,
  purchase_required boolean not null default false,
  available_after_hours integer not null default 0,
  availability_duration_days integer not null default 0,
  is_winning_every_time boolean not null default false
);

create table if not exists public.campaign_actions (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  position integer not null,
  kind text not null check (kind in ('google', 'instagram', 'facebook', 'tiktok', 'tripadvisor', 'crm', 'custom')),
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, position)
);

create table if not exists public.prizes (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  label text not null,
  total_quantity integer,
  remaining_quantity integer,
  probability numeric(8, 2) not null default 0,
  estimated_unit_cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint prizes_total_quantity_check check (total_quantity is null or total_quantity >= 0),
  constraint prizes_remaining_quantity_check check (remaining_quantity is null or remaining_quantity >= 0),
  constraint prizes_probability_check check (probability >= 0 and probability <= 100)
);

create table if not exists public.leads (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  first_name text not null,
  email text not null,
  phone text,
  marketing_consent boolean not null default false,
  consent_timestamp timestamptz not null default now(),
  prize_id text references public.prizes(id) on delete set null,
  status text not null check (status in ('claimed', 'redeemed', 'expired', 'lost')),
  created_at timestamptz not null default now(),
  action_confirmed boolean not null default false,
  redemption_code text,
  reward_available_at timestamptz,
  reward_expires_at timestamptz
);

create table if not exists public.campaign_events (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  lead_id text references public.leads(id) on delete set null,
  event_type text not null check (
    event_type in (
      'scan',
      'form_started',
      'lead_created',
      'review_clicked',
      'review_confirmed',
      'social_clicked',
      'game_played',
      'prize_won',
      'prize_redeemed',
      'prize_expired',
      'prize_reset'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists merchant_users_merchant_id_idx on public.merchant_users (merchant_id);
create unique index if not exists merchant_users_email_lower_idx on public.merchant_users ((lower(email)));

create index if not exists campaigns_merchant_id_idx on public.campaigns (merchant_id);
create index if not exists campaigns_is_active_idx on public.campaigns (is_active);
create index if not exists campaigns_goal_type_idx on public.campaigns (goal_type);

create index if not exists campaign_actions_campaign_id_idx on public.campaign_actions (campaign_id, position);

create index if not exists prizes_campaign_id_idx on public.prizes (campaign_id);

create index if not exists leads_campaign_id_idx on public.leads (campaign_id);
create index if not exists leads_email_lower_idx on public.leads ((lower(email)));
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_prize_id_idx on public.leads (prize_id);
create index if not exists leads_created_at_idx on public.leads (created_at);
create index if not exists leads_reward_expires_at_idx on public.leads (reward_expires_at);
create unique index if not exists leads_redemption_code_unique_idx on public.leads (redemption_code) where redemption_code is not null;

create index if not exists campaign_events_campaign_id_idx on public.campaign_events (campaign_id);
create index if not exists campaign_events_lead_id_idx on public.campaign_events (lead_id);
create index if not exists campaign_events_type_idx on public.campaign_events (event_type);
create index if not exists campaign_events_created_at_idx on public.campaign_events (created_at);

comment on table public.merchants is 'Comptes marchands et configuration de base de la boutique.';
comment on table public.merchant_users is 'Utilisateurs rattachés à un marchand pour la connexion à l espace marchand.';
comment on table public.campaigns is 'Campagnes d activation avec personnalisation complète du rendu public.';
comment on table public.campaign_actions is 'Actions marketing ordonnées affichées avant le jeu public.';
comment on table public.prizes is 'Dotations configurées pour chaque campagne.';
comment on table public.leads is 'Participations et états de retrait des lots.';
comment on table public.campaign_events is 'Journal d événements pour les KPI et l analyse.';

commit;
