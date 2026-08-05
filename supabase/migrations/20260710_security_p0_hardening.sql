begin;

create table if not exists public.public_rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_participation_locks (
  campaign_id text not null,
  date_key date not null,
  fingerprint_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (campaign_id, date_key, fingerprint_hash)
);

create index if not exists public_rate_limits_reset_at_idx
  on public.public_rate_limits (reset_at);

create index if not exists daily_participation_locks_created_at_idx
  on public.daily_participation_locks (created_at);

alter table if exists public.merchants enable row level security;
alter table if exists public.merchant_users enable row level security;
alter table if exists public.campaigns enable row level security;
alter table if exists public.campaign_actions enable row level security;
alter table if exists public.prizes enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.campaign_events enable row level security;
alter table if exists public.draw_sessions enable row level security;
alter table if exists public.background_assets enable row level security;
alter table public.public_rate_limits enable row level security;
alter table public.daily_participation_locks enable row level security;

revoke all on table public.merchants from anon, authenticated;
revoke all on table public.merchant_users from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.campaign_actions from anon, authenticated;
revoke all on table public.prizes from anon, authenticated;
revoke all on table public.leads from anon, authenticated;
revoke all on table public.campaign_events from anon, authenticated;
revoke all on table public.draw_sessions from anon, authenticated;
revoke all on table public.public_rate_limits from anon, authenticated;
revoke all on table public.daily_participation_locks from anon, authenticated;
revoke all on table public.background_assets from anon, authenticated;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'merchants',
    'merchant_users',
    'campaigns',
    'campaign_actions',
    'prizes',
    'leads',
    'campaign_events',
    'draw_sessions',
    'background_assets',
    'public_rate_limits',
    'daily_participation_locks'
  ]
  loop
    policy_name := 'service role manages ' || table_name;
    if not exists (
      select 1
        from pg_policies
       where schemaname = 'public'
         and tablename = table_name
         and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end;
$$;

create or replace function public.consume_public_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_reset_at timestamptz;
  v_count integer;
begin
  if p_key is null or length(trim(p_key)) = 0 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Paramètres de rate limit invalides';
  end if;

  insert into public.public_rate_limits as limits (key, count, reset_at, updated_at)
  values (left(trim(p_key), 420), 1, v_now + make_interval(secs => p_window_seconds), v_now)
  on conflict (key) do update
    set count =
          case
            when limits.reset_at <= v_now then 1
            else limits.count + 1
          end,
        reset_at =
          case
            when limits.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
            else limits.reset_at
          end,
        updated_at = v_now
  returning count, reset_at into v_count, v_reset_at;

  return query
  select
    v_count <= p_limit,
    case
      when v_count <= p_limit then 0
      else greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer)
    end;
end;
$$;

create or replace function public.claim_daily_participation_lock(
  p_campaign_id text,
  p_fingerprint_hash text
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_date_key date := (timezone('utc', now()))::date;
  v_inserted integer := 0;
begin
  if p_campaign_id is null or length(trim(p_campaign_id)) = 0 or
     p_fingerprint_hash is null or length(trim(p_fingerprint_hash)) = 0 then
    raise exception 'Paramètres de participation invalides';
  end if;

  insert into public.daily_participation_locks (
    campaign_id,
    date_key,
    fingerprint_hash,
    created_at
  )
  values (
    left(trim(p_campaign_id), 120),
    v_date_key,
    left(trim(p_fingerprint_hash), 128),
    v_now
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  return query
  select
    v_inserted = 1,
    case
      when v_inserted = 1 then 0
      else greatest(
        1,
        ceil(extract(epoch from (((v_date_key + 1)::timestamp at time zone 'utc') - v_now)))::integer
      )
    end;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_daily_participation_lock(text, text) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_daily_participation_lock(text, text) to service_role;

revoke all on function public.create_draw_session(text, text) from public, anon, authenticated;
revoke all on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.draw_campaign_prize_and_create_lead(text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.get_merchant_campaign_overview(text) from public, anon, authenticated;

grant execute on function public.create_draw_session(text, text) to service_role;
grant execute on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) to service_role;
grant execute on function public.draw_campaign_prize_and_create_lead(text, text, text, text, boolean) to service_role;
grant execute on function public.get_merchant_campaign_overview(text) to service_role;

commit;
