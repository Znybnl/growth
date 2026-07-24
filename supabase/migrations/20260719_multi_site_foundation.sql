begin;

create table if not exists public.merchant_workspaces (
  id text primary key,
  name text not null,
  slug text not null unique,
  default_time_zone text not null default 'Europe/Paris',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  subscription_current_period_end timestamptz,
  subscription_cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.merchants
  add column if not exists workspace_id text,
  add column if not exists location_code text,
  add column if not exists location_status text not null default 'active',
  add column if not exists time_zone text not null default 'Europe/Paris';

alter table public.merchants
  drop constraint if exists merchants_location_status_check;

alter table public.merchants
  add constraint merchants_location_status_check
  check (location_status in ('active', 'archived'));

insert into public.merchant_workspaces (id, name, slug, default_time_zone, created_at)
select
  'workspace-' || m.id,
  m.company_name,
  'workspace-' || m.id,
  coalesce(m.time_zone, 'Europe/Paris'),
  m.created_at
from public.merchants m
on conflict (id) do nothing;

update public.merchant_workspaces w
set
  stripe_customer_id = coalesce(w.stripe_customer_id, m.stripe_customer_id),
  stripe_subscription_id = coalesce(w.stripe_subscription_id, m.stripe_subscription_id),
  stripe_subscription_status = coalesce(w.stripe_subscription_status, m.stripe_subscription_status),
  subscription_current_period_end = coalesce(w.subscription_current_period_end, m.subscription_current_period_end),
  subscription_cancel_at_period_end = coalesce(w.subscription_cancel_at_period_end, m.subscription_cancel_at_period_end, false)
from public.merchants m
where m.workspace_id is null and w.id = 'workspace-' || m.id;

update public.merchants
set
  workspace_id = 'workspace-' || id,
  location_code = coalesce(location_code, upper(substr(md5(id), 1, 6)))
where workspace_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'merchants_workspace_id_fkey'
  ) then
    alter table public.merchants
      add constraint merchants_workspace_id_fkey
      foreign key (workspace_id) references public.merchant_workspaces(id) on delete cascade;
  end if;
end $$;

alter table public.merchants
  alter column workspace_id set not null;

create unique index if not exists merchants_workspace_location_code_idx
  on public.merchants (workspace_id, location_code)
  where location_code is not null;

create index if not exists merchants_workspace_id_idx
  on public.merchants (workspace_id, location_status);

create table if not exists public.merchant_workspace_memberships (
  id text primary key,
  workspace_id text not null references public.merchant_workspaces(id) on delete cascade,
  merchant_user_id text not null references public.merchant_users(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner', 'admin', 'manager', 'cashier', 'analyst')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, merchant_user_id)
);

create table if not exists public.merchant_membership_locations (
  membership_id text not null references public.merchant_workspace_memberships(id) on delete cascade,
  merchant_id text not null references public.merchants(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (membership_id, merchant_id)
);

insert into public.merchant_workspace_memberships (id, workspace_id, merchant_user_id, role, created_at)
select
  'membership-' || mu.id,
  m.workspace_id,
  mu.id,
  'owner',
  mu.created_at
from public.merchant_users mu
join public.merchants m on m.id = mu.merchant_id
on conflict (workspace_id, merchant_user_id) do nothing;

insert into public.merchant_membership_locations (membership_id, merchant_id)
select
  mwm.id,
  m.id
from public.merchant_workspace_memberships mwm
join public.merchant_users mu on mu.id = mwm.merchant_user_id
join public.merchants m on m.workspace_id = mwm.workspace_id
where mwm.role in ('owner', 'admin')
on conflict do nothing;

insert into public.merchant_membership_locations (membership_id, merchant_id)
select
  mwm.id,
  mu.merchant_id
from public.merchant_workspace_memberships mwm
join public.merchant_users mu on mu.id = mwm.merchant_user_id
where mwm.role not in ('owner', 'admin')
on conflict do nothing;

create index if not exists merchant_workspace_memberships_user_idx
  on public.merchant_workspace_memberships (merchant_user_id, status);

create index if not exists merchant_membership_locations_merchant_idx
  on public.merchant_membership_locations (merchant_id);

alter table public.merchant_workspaces enable row level security;
alter table public.merchant_workspace_memberships enable row level security;
alter table public.merchant_membership_locations enable row level security;

revoke all on table public.merchant_workspaces from public, anon, authenticated;
revoke all on table public.merchant_workspace_memberships from public, anon, authenticated;
revoke all on table public.merchant_membership_locations from public, anon, authenticated;

grant all on table public.merchant_workspaces to service_role;
grant all on table public.merchant_workspace_memberships to service_role;
grant all on table public.merchant_membership_locations to service_role;

commit;
