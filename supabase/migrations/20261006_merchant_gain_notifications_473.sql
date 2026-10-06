-- #473. Additive migration; defaults remain disabled. No historical gains queued.
begin;
set local lock_timeout = '5s';

create table if not exists public.merchant_gain_notification_preferences (
  user_id text not null references public.merchant_users(id) on delete cascade,
  merchant_id text not null references public.merchants(id) on delete cascade,
  frequency text not null default 'disabled'
    check (frequency in ('disabled','instant','daily','weekly','monthly')),
  updated_at timestamptz not null default now(),
  primary key(user_id, merchant_id)
);
create index if not exists gain_preferences_enabled_idx
  on public.merchant_gain_notification_preferences(merchant_id) where frequency <> 'disabled';

create table if not exists public.merchant_gain_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  merchant_id text not null,
  frequency text not null,
  merchant_name text not null,
  time_zone text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  part integer not null default 1,
  parts integer not null default 1,
  gains jsonb not null,
  email_payload jsonb,
  status text not null default 'pending'
    check (status in ('pending','sending','sent','cancelled','needs_review')),
  attempts integer not null default 0,
  recipient text,
  first_attempt_at timestamptz,
  lease_until timestamptz,
  lease_token uuid,
  retry_at timestamptz not null default now(),
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  foreign key(user_id,merchant_id)
    references public.merchant_gain_notification_preferences on delete cascade
);
create index if not exists gain_jobs_pending_idx
  on public.merchant_gain_notification_jobs(retry_at) where status in ('pending','sending');
create index if not exists gain_jobs_snapshot_idx
  on public.merchant_gain_notification_jobs using gin(gains jsonb_path_ops);

create table if not exists public.merchant_gain_notification_events (
  user_id text not null,
  merchant_id text not null,
  lead_id text not null references public.leads(id) on delete cascade,
  campaign_id text not null,
  campaign_title text not null,
  prize_label text not null,
  won_at timestamptz not null,
  job_id uuid references public.merchant_gain_notification_jobs(id) on delete set null,
  primary key(user_id, merchant_id, lead_id),
  foreign key(user_id,merchant_id)
    references public.merchant_gain_notification_preferences on delete cascade
);
create index if not exists gain_events_waiting_idx
  on public.merchant_gain_notification_events(user_id,merchant_id,won_at) where job_id is null;

-- Identical access semantics to workspace resolution: active membership and site,
-- owners/admins have all sites, other roles only explicitly assigned sites.
create or replace function public.can_receive_merchant_gain_notification(p_user text, p_merchant text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.merchants m
    join public.merchant_workspace_memberships w on w.workspace_id=m.workspace_id
    where m.id=p_merchant and m.location_status='active'
      and w.merchant_user_id=p_user and w.status='active'
      and (w.role in ('owner','admin') or exists (
        select 1 from public.merchant_membership_locations a
        where a.membership_id=w.id and a.merchant_id=m.id))
  )
$$;

create or replace function public.queue_merchant_gain_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare site text; game text; lot text; pref record;
begin
  if new.prize_id is null or new.status <> 'claimed' then return new; end if;
  select c.merchant_id,c.title,p.label into site,game,lot
    from public.campaigns c join public.prizes p on p.campaign_id=c.id
    where c.id=new.campaign_id and p.id=new.prize_id;
  if site is null then return new; end if;
  for pref in select * from public.merchant_gain_notification_preferences
    where merchant_id=site and frequency<>'disabled' for share loop
    if public.can_receive_merchant_gain_notification(pref.user_id,site) then
      insert into public.merchant_gain_notification_events
        (user_id,merchant_id,lead_id,campaign_id,campaign_title,prize_label,won_at)
      values(pref.user_id,site,new.id,new.campaign_id,game,lot,new.created_at)
      on conflict do nothing;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists queue_merchant_gain_notification on public.leads;
create trigger queue_merchant_gain_notification after insert on public.leads
  for each row execute function public.queue_merchant_gain_notification();
-- Preview participations have their own table: intentionally no trigger there.

create or replace function public.set_merchant_gain_notification_preference(
  p_user text, p_merchant text, p_frequency text
) returns public.merchant_gain_notification_preferences
language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.merchant_gain_notification_preferences;
begin
  if not public.can_receive_merchant_gain_notification(p_user,p_merchant) then
    raise exception 'Access denied'; end if;
  insert into public.merchant_gain_notification_preferences(user_id,merchant_id,frequency)
    values(p_user,p_merchant,p_frequency)
    on conflict(user_id,merchant_id) do update set
      frequency=excluded.frequency, updated_at=case
        when merchant_gain_notification_preferences.frequency<>excluded.frequency then now()
        else merchant_gain_notification_preferences.updated_at end
    returning * into result;
  if result.frequency='disabled' then
    -- A request already handed to the provider cannot be revoked. Stop all
    -- other jobs, including retries, and do not replay gains on reactivation.
    update public.merchant_gain_notification_jobs set status='cancelled',
      gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
      where user_id=p_user and merchant_id=p_merchant and status in ('pending','sending','needs_review');
    delete from public.merchant_gain_notification_events
      where user_id=p_user and merchant_id=p_merchant and job_id is null;
  end if;
  return result;
end $$;

-- A transactional worker creates complete immutable, paginated lists and claims
-- an exclusive lease. Retries reuse the same job/key/payload, not a new digest.
create or replace function public.claim_merchant_gain_notification(
  p_now timestamptz default now(), p_lead text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  pref record; local_now timestamp; cutoff timestamptz; zone text;
  candidate public.merchant_gain_notification_jobs;
  selected_ids text[]; start_at timestamptz; end_at timestamptz;
  all_gains jsonb; count_gains integer; pages integer; i integer; new_id uuid;
  recipient_email text; first_lead text;
begin
  -- Do not retry an ambiguous send after the provider's 24h idempotency window.
  update public.merchant_gain_notification_jobs set status='needs_review'
    where status in ('pending','sending') and first_attempt_at < p_now-interval '23 hours';
  update public.merchant_gain_notification_jobs j set status='cancelled',
    gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
    where j.status in ('pending','sending','needs_review') and (
      not public.can_receive_merchant_gain_notification(j.user_id,j.merchant_id)
      or not exists(select 1 from public.merchant_gain_notification_preferences p
        where p.user_id=j.user_id and p.merchant_id=j.merchant_id and p.frequency<>'disabled')
      or (j.recipient is not null and j.recipient <> (
        select email from public.merchant_users where id=j.user_id))
      or exists(select 1 from jsonb_array_elements(j.gains) g
        where not exists(select 1 from public.leads l where l.id=g->>'leadId'
          and l.status<>'lost' and l.prize_id is not null)));

  -- Serialize workers per preference, not across all establishments.
  for pref in select p.* from public.merchant_gain_notification_preferences p
    where frequency<>'disabled' and public.can_receive_merchant_gain_notification(user_id,merchant_id)
      and exists(select 1 from public.merchant_gain_notification_events e
        where e.user_id=p.user_id and e.merchant_id=p.merchant_id and e.job_id is null
          and (p_lead is null or (p.frequency='instant' and e.lead_id=p_lead)))
    order by (select min(e.won_at) from public.merchant_gain_notification_events e
      where e.user_id=p.user_id and e.merchant_id=p.merchant_id and e.job_id is null),
      p.user_id,p.merchant_id for update skip locked loop
    select time_zone into zone from public.merchants where id=pref.merchant_id;
    if not exists(select 1 from pg_timezone_names where name=zone) then zone:='Europe/Paris'; end if;
    local_now:=p_now at time zone zone;
    if pref.frequency='instant' then cutoff:=p_now;
    else
      -- 09:00 local, including DST. Before 09:00 use the previous day's boundary
      -- so missed periods are recovered without sending today's digest early.
      if local_now::time < time '09:00' then local_now:=local_now-interval '1 day'; end if;
      cutoff:=date_trunc(case pref.frequency when 'daily' then 'day'
        when 'weekly' then 'week' else 'month' end,local_now) at time zone zone;
    end if;
    -- For digests select only the earliest closed period; catch up in order.
    select e.won_at,e.lead_id into start_at,first_lead from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id and e.job_id is null
        and e.won_at<cutoff and l.prize_id is not null and l.status<>'lost'
        and (p_lead is null or e.lead_id=p_lead)
      order by e.won_at,e.lead_id limit 1;
    if start_at is null then continue; end if;
    if pref.frequency='instant' then end_at:=start_at+interval '1 microsecond';
    else
      start_at:=date_trunc(case pref.frequency when 'daily' then 'day'
        when 'weekly' then 'week' else 'month' end,start_at at time zone zone) at time zone zone;
      end_at:=((start_at at time zone zone)+case pref.frequency when 'daily' then interval '1 day'
        when 'weekly' then interval '1 week' else interval '1 month' end) at time zone zone;
    end if;
    select array_agg(e.lead_id order by e.won_at,e.lead_id),
      jsonb_agg(jsonb_build_object('leadId',e.lead_id,'campaignId',e.campaign_id,
        'campaignTitle',e.campaign_title,'prizeLabel',e.prize_label,'wonAt',e.won_at,
        'firstName',l.first_name,'lastName',l.last_name)
        order by e.won_at,e.lead_id)
      into selected_ids,all_gains from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id and e.job_id is null
        and e.won_at>=start_at and e.won_at<end_at and l.prize_id is not null and l.status<>'lost'
        and (p_lead is null or e.lead_id=p_lead)
        and (pref.frequency<>'instant' or e.lead_id=first_lead);
    count_gains:=coalesce(array_length(selected_ids,1),0);
    if count_gains=0 then continue; end if;
    pages:=ceil(count_gains/40.0);
    for i in 1..pages loop
      insert into public.merchant_gain_notification_jobs
        (user_id,merchant_id,frequency,merchant_name,time_zone,period_start,period_end,part,parts,gains,retry_at)
      values(pref.user_id,pref.merchant_id,pref.frequency,
        (select company_name from public.merchants where id=pref.merchant_id),zone,
        start_at,end_at,i,pages,
        (select jsonb_agg(v) from jsonb_array_elements(all_gains) with ordinality a(v,n)
          where n>(i-1)*40 and n<=i*40),p_now)
      returning id into new_id;
      update public.merchant_gain_notification_events set job_id=new_id
        where user_id=pref.user_id and merchant_id=pref.merchant_id
          and lead_id=any(selected_ids[((i-1)*40+1):least(i*40,count_gains)]);
    end loop;
    exit;
  end loop;

  select j.* into candidate from public.merchant_gain_notification_jobs j
    where j.status in ('pending','sending') and j.retry_at<=p_now
      and (j.lease_until is null or j.lease_until<p_now)
      and (p_lead is null or (j.frequency='instant' and exists(
        select 1 from jsonb_array_elements(j.gains) g where g->>'leadId'=p_lead)))
    order by j.retry_at,j.created_at,j.part,j.id for update skip locked limit 1;
  if candidate.id is null then return null; end if;
  select email into recipient_email from public.merchant_users where id=candidate.user_id;
  update public.merchant_gain_notification_jobs set status='sending',
    attempts=attempts+1, first_attempt_at=coalesce(first_attempt_at,p_now),
    lease_until=p_now+interval '5 minutes', lease_token=gen_random_uuid(),
    recipient=coalesce(recipient,recipient_email)
    where id=candidate.id returning * into candidate;
  return to_jsonb(candidate);
end $$;

-- Freeze exact HTML/text/subject/from before sending, including across deploys.
-- The destination stays the separately verified account address, never payload.
create or replace function public.prepare_merchant_gain_notification_payload(
  p_id uuid,p_token uuid,p_payload jsonb,p_now timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if jsonb_typeof(p_payload)<>'object'
    or jsonb_typeof(p_payload->'subject') is distinct from 'string'
    or jsonb_typeof(p_payload->'html') is distinct from 'string'
    or jsonb_typeof(p_payload->'text') is distinct from 'string'
    or jsonb_typeof(p_payload->'from') is distinct from 'string'
    or p_payload ? 'to' then raise exception 'Invalid payload'; end if;
  update public.merchant_gain_notification_jobs set
    email_payload=coalesce(email_payload,jsonb_build_object(
      'subject',p_payload->'subject','html',p_payload->'html',
      'text',p_payload->'text','from',p_payload->'from'))
    where id=p_id and lease_token=p_token and status='sending' and lease_until>p_now
    returning email_payload into result;
  return result;
end $$;

-- Prevent stale workers from acknowledging someone else's lease.
create or replace function public.finish_merchant_gain_notification(
  p_id uuid,p_token uuid,p_sent boolean,p_provider_id text default null,p_now timestamptz default now()
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.merchant_gain_notification_jobs set
    status=case when p_sent then 'sent' when attempts>=6 then 'needs_review' else 'pending' end,
    provider_id=case when p_sent then p_provider_id else provider_id end,
    sent_at=case when p_sent then p_now else sent_at end,lease_until=null,lease_token=null,
    gains=case when p_sent then '[]'::jsonb else gains end,
    email_payload=case when p_sent then null else email_payload end,
    recipient=case when p_sent then null else recipient end,
    retry_at=p_now+least(interval '2 hours',interval '1 minute'*power(2,attempts))
    where id=p_id and lease_token=p_token and status='sending';
end $$;

-- Deleting a participation must also remove its snapshot from an unsent job.
-- Cancel the immutable chunk rather than risk replaying a partly accepted mail.
create or replace function public.redact_deleted_gain_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.merchant_gain_notification_jobs j set gains='[]'::jsonb,email_payload=null,
    recipient=null,lease_until=null,lease_token=null,
    status=case when status='sent' then 'sent' else 'cancelled' end
    where j.gains @> jsonb_build_array(jsonb_build_object('leadId',old.id));
  return old;
end $$;
drop trigger if exists redact_deleted_gain_notification on public.leads;
create trigger redact_deleted_gain_notification after delete on public.leads
  for each row execute function public.redact_deleted_gain_notification();

-- Recheck permission, preference, current recipient and lease immediately before
-- contacting the provider; a provider-accepted send is necessarily irrevocable.
create or replace function public.authorize_merchant_gain_notification(p_id uuid,p_token uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.merchant_gain_notification_jobs j
    join public.merchant_gain_notification_preferences p
      on p.user_id=j.user_id and p.merchant_id=j.merchant_id
    join public.merchant_users u on u.id=j.user_id
    where j.id=p_id and j.lease_token=p_token and j.status='sending'
      and j.lease_until>now() and p.frequency<>'disabled' and u.email=j.recipient
      and public.can_receive_merchant_gain_notification(j.user_id,j.merchant_id)
      and not exists(select 1 from jsonb_array_elements(j.gains) g
        where not exists(select 1 from public.leads l where l.id=g->>'leadId'
          and l.status<>'lost' and l.prize_id is not null)))
$$;

-- RLS with no client policies: all access passes the authenticated server API.
alter table public.merchant_gain_notification_preferences enable row level security;
alter table public.merchant_gain_notification_events enable row level security;
alter table public.merchant_gain_notification_jobs enable row level security;
revoke all on public.merchant_gain_notification_preferences,
  public.merchant_gain_notification_events,public.merchant_gain_notification_jobs from public,anon,authenticated;
grant all on public.merchant_gain_notification_preferences,
  public.merchant_gain_notification_events,public.merchant_gain_notification_jobs to service_role;
revoke all on function public.can_receive_merchant_gain_notification(text,text),
  public.queue_merchant_gain_notification(),
  public.redact_deleted_gain_notification(),
  public.set_merchant_gain_notification_preference(text,text,text),
  public.claim_merchant_gain_notification(timestamptz,text),
  public.authorize_merchant_gain_notification(uuid,uuid),
  public.prepare_merchant_gain_notification_payload(uuid,uuid,jsonb,timestamptz),
  public.finish_merchant_gain_notification(uuid,uuid,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function public.can_receive_merchant_gain_notification(text,text),
  public.set_merchant_gain_notification_preference(text,text,text),
  public.claim_merchant_gain_notification(timestamptz,text),
  public.authorize_merchant_gain_notification(uuid,uuid),
  public.prepare_merchant_gain_notification_payload(uuid,uuid,jsonb,timestamptz),
  public.finish_merchant_gain_notification(uuid,uuid,boolean,text,timestamptz) to service_role;
commit;
