-- #304: private account-wide settings and a separate, idempotent service-email outbox.
-- No existing account is enabled; no scheduler or production sending is activated here.
begin;
set local lock_timeout = '5s';

create table if not exists public.reward_reminder_settings (
  workspace_id text primary key references public.merchant_workspaces(id) on delete cascade,
  enabled boolean not null default false,
  days smallint not null default 7 check (days between 1 and 365),
  version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
create table if not exists public.reward_reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null unique references public.leads(id) on delete cascade,
  workspace_id text not null references public.merchant_workspaces(id) on delete cascade,
  merchant_id text not null references public.merchants(id) on delete cascade,
  scheduled_at timestamptz not null,
  expires_at timestamptz not null,
  preference_version uuid not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','cancelled','needs_review')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  retry_at timestamptz not null,
  lease_until timestamptz,
  lease_token uuid,
  email_payload jsonb,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists reward_reminder_pending_idx on public.reward_reminder_jobs(retry_at) where status in ('pending','sending');
create index if not exists reward_reminder_workspace_idx on public.reward_reminder_jobs(workspace_id,status);
create index if not exists reward_reminder_expiry_idx on public.leads(reward_expires_at) where status='claimed' and reward_expires_at is not null;
alter table public.reward_reminder_settings enable row level security;
alter table public.reward_reminder_jobs enable row level security;
revoke all on public.reward_reminder_settings, public.reward_reminder_jobs from public, anon, authenticated;
grant all on public.reward_reminder_settings, public.reward_reminder_jobs to service_role;

create or replace function public.reward_reminder_zone(p_zone text)
returns text language sql stable set search_path = pg_catalog,public as $$
  select coalesce((select name from pg_timezone_names where name=p_zone limit 1),'Europe/Paris')
$$;
create or replace function public.reward_reminder_due(p_expiry timestamptz,p_days integer,p_zone text)
returns timestamptz language sql stable set search_path = pg_catalog,public as $$
  select (((p_expiry at time zone public.reward_reminder_zone(p_zone))::date-p_days)+time '09:00')
    at time zone public.reward_reminder_zone(p_zone)
$$;

create or replace function public.get_reward_reminder_settings(p_user text,p_workspace text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog,public as $$
declare can_edit boolean;
begin
  select role in ('owner','admin') into can_edit from public.merchant_workspace_memberships
    where merchant_user_id=p_user and workspace_id=p_workspace and status='active' limit 1;
  if not found then raise exception 'Access denied' using errcode='42501'; end if;
  return coalesce((select jsonb_build_object('enabled',enabled,'days',days,'canEdit',can_edit,'updatedAt',updated_at)
    from public.reward_reminder_settings where workspace_id=p_workspace),
    jsonb_build_object('enabled',false,'days',7,'canEdit',can_edit,'updatedAt',null));
end $$;

create or replace function public.set_reward_reminder_settings(p_user text,p_workspace text,p_enabled boolean,p_days integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog,public as $$
begin
  if not exists(select 1 from public.merchant_workspace_memberships where merchant_user_id=p_user
    and workspace_id=p_workspace and status='active' and role in ('owner','admin')) then
    raise exception 'Access denied' using errcode='42501'; end if;
  if p_enabled is null or p_days is null or p_days not between 1 and 365 then
    raise exception 'Invalid settings' using errcode='22023'; end if;
  insert into public.reward_reminder_settings(workspace_id,enabled,days) values(p_workspace,p_enabled,p_days)
  on conflict(workspace_id) do update set enabled=excluded.enabled,days=excluded.days,version=gen_random_uuid(),updated_at=clock_timestamp()
    where (reward_reminder_settings.enabled,reward_reminder_settings.days) is distinct from (excluded.enabled,excluded.days);
  -- An already authorized provider request cannot be recalled. Never reuse its identity.
  update public.reward_reminder_jobs j set status=case when attempts=0 then 'cancelled' else 'needs_review' end,
    email_payload=null,lease_token=null,lease_until=null
    from public.reward_reminder_settings p where j.workspace_id=p_workspace and p.workspace_id=j.workspace_id
      and j.preference_version<>p.version and (j.status='pending' or (j.status='sending' and j.first_attempt_at is null));
  return public.get_reward_reminder_settings(p_user,p_workspace);
end $$;

create or replace function public.reward_reminder_gain_eligible(p_lead text,p_now timestamptz)
returns boolean language sql stable security definer set search_path = pg_catalog,public as $$
  select exists(select 1 from public.leads l join public.campaigns c on c.id=l.campaign_id
    join public.merchants m on m.id=c.merchant_id join public.reward_reminder_settings p on p.workspace_id=m.workspace_id
  where l.id=p_lead and p.enabled and m.location_status='active' and l.status='claimed' and l.redeemed_at is null
      and not coalesce((to_jsonb(l)->>'is_preview')::boolean,false)
      and l.prize_id is not null and exists(select 1 from public.prizes x where x.id=l.prize_id and x.campaign_id=c.id)
      and l.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(l.email)<=254
      and coalesce(l.redemption_code,'')<>'' and l.created_at is not null
      and l.reward_expires_at>=l.created_at+interval '480 hours' and l.reward_expires_at>p_now
      and (l.reward_available_at is null or l.reward_available_at<=p_now)
      and public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)>l.created_at
      and p.updated_at<=public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
      and p_now>=public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
      and p_now<public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)+interval '5 minutes')
$$;

create or replace function public.enqueue_reward_reminders(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = pg_catalog,public as $$
declare count_added integer;
begin
  insert into public.reward_reminder_jobs(lead_id,workspace_id,merchant_id,scheduled_at,expires_at,preference_version,retry_at,created_at)
    select l.id,m.workspace_id,m.id,public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone),l.reward_expires_at,p.version,p_now,p_now
    from public.leads l join public.campaigns c on c.id=l.campaign_id join public.merchants m on m.id=c.merchant_id
      join public.reward_reminder_settings p on p.workspace_id=m.workspace_id
    where p.enabled and l.status='claimed' and l.reward_expires_at between p_now and p_now+interval '366 days'
      and l.reward_expires_at>=(((p_now at time zone public.reward_reminder_zone(m.time_zone))::date+p.days)::timestamp at time zone public.reward_reminder_zone(m.time_zone))
      and l.reward_expires_at<(((p_now at time zone public.reward_reminder_zone(m.time_zone))::date+p.days+1)::timestamp at time zone public.reward_reminder_zone(m.time_zone))
      and public.reward_reminder_gain_eligible(l.id,p_now)
    on conflict(lead_id) do update set scheduled_at=excluded.scheduled_at,expires_at=excluded.expires_at,
      preference_version=excluded.preference_version,status='pending',retry_at=excluded.retry_at,email_payload=null
      where reward_reminder_jobs.status='cancelled' and reward_reminder_jobs.attempts=0;
  get diagnostics count_added=row_count;
  return count_added;
end $$;

create or replace function public.reward_reminder_job_valid(p_id uuid,p_now timestamptz)
returns boolean language sql stable security definer set search_path = pg_catalog,public as $$
  select exists(select 1 from public.reward_reminder_jobs j join public.reward_reminder_settings p on p.workspace_id=j.workspace_id
    join public.leads l on l.id=j.lead_id join public.campaigns c on c.id=l.campaign_id join public.merchants m on m.id=c.merchant_id
    where j.id=p_id and p.enabled and p.version=j.preference_version and m.workspace_id=j.workspace_id and m.id=j.merchant_id
      and l.reward_expires_at=j.expires_at and j.scheduled_at=public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
      and public.reward_reminder_gain_eligible(l.id,p_now))
$$;

create or replace function public.claim_reward_reminder(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = pg_catalog,public as $$
declare job public.reward_reminder_jobs;
begin
  update public.reward_reminder_jobs j set status=case when attempts=0 then 'cancelled' else 'needs_review' end,
    email_payload=null,lease_token=null,lease_until=null
    where (status='pending' or (status='sending' and lease_until<=p_now))
      and (not public.reward_reminder_job_valid(j.id,p_now) or attempts>=5 or first_attempt_at<=p_now-interval '23 hours');
  select * into job from public.reward_reminder_jobs j
    where (status='pending' or (status='sending' and lease_until<=p_now)) and retry_at<=p_now
      and public.reward_reminder_job_valid(j.id,p_now)
    order by scheduled_at,id for update skip locked limit 1;
  if not found then return null; end if;
  update public.reward_reminder_jobs set status='sending',lease_token=gen_random_uuid(),lease_until=p_now+interval '2 minutes'
    where id=job.id returning * into job;
  return to_jsonb(job);
end $$;

create or replace function public.prepare_reward_reminder(p_id uuid,p_token uuid,p_payload jsonb,p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = pg_catalog,public as $$
declare payload jsonb;
begin
  if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>2000000 then raise exception 'Invalid payload' using errcode='22023'; end if;
  update public.reward_reminder_jobs set email_payload=coalesce(email_payload,p_payload)
    where id=p_id and lease_token=p_token and status='sending' and lease_until>p_now and public.reward_reminder_job_valid(id,p_now)
    returning email_payload into payload;
  return payload;
end $$;

create or replace function public.authorize_reward_reminder(p_id uuid,p_token uuid,p_now timestamptz default now())
returns boolean language plpgsql security definer set search_path = pg_catalog,public as $$
declare job public.reward_reminder_jobs;
begin
  select * into job from public.reward_reminder_jobs where id=p_id and lease_token=p_token and status='sending' for update;
  if not found or job.lease_until<=p_now or job.email_payload is null then return false; end if;
  if not public.reward_reminder_job_valid(job.id,p_now) or job.attempts>=5
    or job.first_attempt_at<=p_now-interval '23 hours'
    or not exists(select 1 from public.leads where id=job.lead_id and email=job.email_payload->>'to') then
    update public.reward_reminder_jobs set status=case when attempts=0 then 'cancelled' else 'needs_review' end,
      email_payload=null,lease_token=null,lease_until=null where id=job.id;
    return false;
  end if;
  update public.reward_reminder_jobs set attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,p_now) where id=job.id;
  return true;
end $$;

create or replace function public.finish_reward_reminder(p_id uuid,p_token uuid,p_provider text,p_now timestamptz default now())
returns boolean language plpgsql security definer set search_path = pg_catalog,public as $$
begin
  update public.reward_reminder_jobs j set
    status=case when p_provider is not null then 'sent' when attempts>=5 or not public.reward_reminder_job_valid(j.id,p_now) then 'needs_review' else 'pending' end,
    provider_id=p_provider,sent_at=case when p_provider is not null then p_now else null end,
    email_payload=case when p_provider is not null or attempts>=5 or not public.reward_reminder_job_valid(j.id,p_now) then null else email_payload end,
    retry_at=p_now+interval '30 seconds',lease_token=null,lease_until=null
    where id=p_id and lease_token=p_token and status='sending';
  return found;
end $$;

create table if not exists public.reward_reminder_runner (
  singleton boolean primary key default true check(singleton), token uuid, lease_until timestamptz
);
alter table public.reward_reminder_runner enable row level security;
revoke all on public.reward_reminder_runner from public,anon,authenticated;
grant all on public.reward_reminder_runner to service_role;
insert into public.reward_reminder_runner(singleton) values(true) on conflict do nothing;
create or replace function public.acquire_reward_reminder_runner(p_now timestamptz default now())
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare token uuid;
begin
  update public.reward_reminder_runner set token=gen_random_uuid(),lease_until=p_now+interval '270 seconds'
    where singleton and (lease_until is null or lease_until<=p_now) returning reward_reminder_runner.token into token;
  return token;
end $$;
create or replace function public.release_reward_reminder_runner(p_token uuid)
returns void language sql security definer set search_path=pg_catalog,public as $$
  update public.reward_reminder_runner set token=null,lease_until=null where token=p_token
$$;

-- Only data needed to render this leased reminder, not campaign performance/history.
create or replace function public.get_reward_reminder_input(p_id uuid,p_token uuid,p_now timestamptz default now())
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'firstName',l.first_name,'merchantName',m.company_name,'campaignTitle',c.title,
    'prizeLabel',coalesce(to_jsonb(l)->>'prize_label_snapshot',x.label),
    'usageConditions',coalesce(to_jsonb(l)->>'prize_usage_conditions_snapshot',c.campaign_local_settings->'prizeSettings'->x.id->>'usageConditions',''),
    'purchaseRequired',x.purchase_required,'redemptionCode',l.redemption_code,
    'expiresAt',l.reward_expires_at,'availableAt',l.reward_available_at,'wonAt',l.created_at,'timeZone',public.reward_reminder_zone(m.time_zone),
    'logoUrl',c.logo_url,'appointmentUrl',m.appointment_url,'merchantEmail',m.restaurant_email,'industry',m.industry,
    'emailSettings',c.campaign_local_settings->'email','recipient',l.email
  )) from public.reward_reminder_jobs j join public.leads l on l.id=j.lead_id
    join public.campaigns c on c.id=l.campaign_id join public.prizes x on x.id=l.prize_id
    join public.merchants m on m.id=c.merchant_id
  where j.id=p_id and j.lease_token=p_token and j.status='sending' and j.lease_until>p_now
    and public.reward_reminder_job_valid(j.id,p_now)
$$;

-- Default function EXECUTE permissions must never expose private helpers/RPCs.
do $$ declare signature regprocedure;
begin
  for signature in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('reward_reminder_zone','reward_reminder_due','get_reward_reminder_settings',
      'set_reward_reminder_settings','reward_reminder_gain_eligible','enqueue_reward_reminders','reward_reminder_job_valid',
      'claim_reward_reminder','prepare_reward_reminder','authorize_reward_reminder','finish_reward_reminder',
      'acquire_reward_reminder_runner','release_reward_reminder_runner','get_reward_reminder_input')
  loop
    execute format('revoke all on function %s from public,anon,authenticated',signature);
    execute format('grant execute on function %s to service_role',signature);
  end loop;
end $$;
commit;
