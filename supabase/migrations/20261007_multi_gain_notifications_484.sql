begin;
set local lock_timeout = '5s';

-- Expand the existing single choice into independent notification channels.
-- Preserve every current selection as exactly one enabled channel; missing rows
-- and disabled rows remain disabled.
alter table public.merchant_gain_notification_preferences
  add column enabled_frequencies text[] not null default array[]::text[];
update public.merchant_gain_notification_preferences
set enabled_frequencies = case when frequency='disabled' then array[]::text[] else array[frequency] end;
alter table public.merchant_gain_notification_preferences
  add constraint merchant_gain_notification_frequencies_check
    check (enabled_frequencies <@ array['instant','daily','weekly','monthly']::text[]);
create index gain_preferences_channels_idx
  on public.merchant_gain_notification_preferences using gin(enabled_frequencies);

-- One outbox row per gain and selected channel allows the same gain to appear
-- in an immediate email and independently in every requested digest period.
alter table public.merchant_gain_notification_events add column frequency text;
update public.merchant_gain_notification_events e set frequency=j.frequency
  from public.merchant_gain_notification_jobs j where e.job_id=j.id;
update public.merchant_gain_notification_events e set frequency=p.frequency
  from public.merchant_gain_notification_preferences p
  where e.frequency is null and e.user_id=p.user_id and e.merchant_id=p.merchant_id;
-- A disabled legacy preference must never revive an unassigned historical gain.
delete from public.merchant_gain_notification_events where frequency is null;
alter table public.merchant_gain_notification_events alter column frequency set not null;
alter table public.merchant_gain_notification_events drop constraint merchant_gain_notification_events_pkey;
alter table public.merchant_gain_notification_events
  add constraint merchant_gain_notification_events_pkey primary key(user_id,merchant_id,lead_id,frequency),
  add constraint merchant_gain_notification_events_frequency_check
    check (frequency in ('instant','daily','weekly','monthly'));
create index gain_events_channel_waiting_idx
  on public.merchant_gain_notification_events(user_id,merchant_id,frequency,won_at)
  where job_id is null;

create or replace function public.queue_merchant_gain_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare site text; game text; lot text; pref record; channel text;
begin
  if new.prize_id is null or new.status <> 'claimed' then return new; end if;
  select c.merchant_id,c.title,p.label into site,game,lot
    from public.campaigns c join public.prizes p on p.campaign_id=c.id
    where c.id=new.campaign_id and p.id=new.prize_id;
  if site is null then return new; end if;
  for pref in select * from public.merchant_gain_notification_preferences
    where merchant_id=site and cardinality(enabled_frequencies)>0 for share loop
    if public.can_receive_merchant_gain_notification(pref.user_id,site) then
      foreach channel in array pref.enabled_frequencies loop
        insert into public.merchant_gain_notification_events
          (user_id,merchant_id,lead_id,campaign_id,campaign_title,prize_label,won_at,frequency)
        values(pref.user_id,site,new.id,new.campaign_id,game,lot,new.created_at,channel)
        on conflict do nothing;
      end loop;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.set_merchant_gain_notification_preferences(
  p_user text, p_merchant text, p_frequencies text[]
) returns public.merchant_gain_notification_preferences
language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.merchant_gain_notification_preferences;
  normalized text[]; legacy_frequency text;
begin
  if p_frequencies is null or exists(
    select 1 from unnest(p_frequencies) requested(frequency)
    where requested.frequency is null or requested.frequency not in ('instant','daily','weekly','monthly'))
  then raise exception 'Invalid notification frequencies'; end if;
  select coalesce(array_agg(selected.frequency
      order by array_position(array['instant','daily','weekly','monthly']::text[],selected.frequency)),
      array[]::text[])
    into normalized from (
      select distinct requested.frequency
      from unnest(p_frequencies) requested(frequency)
    ) selected;
  if not public.can_receive_merchant_gain_notification(p_user,p_merchant) then
    raise exception 'Access denied'; end if;
  legacy_frequency:=coalesce(normalized[1],'disabled');
  insert into public.merchant_gain_notification_preferences(user_id,merchant_id,frequency,enabled_frequencies)
    values(p_user,p_merchant,legacy_frequency,normalized)
    on conflict(user_id,merchant_id) do update set
      frequency=excluded.frequency, enabled_frequencies=excluded.enabled_frequencies,
      updated_at=case
        when merchant_gain_notification_preferences.enabled_frequencies<>excluded.enabled_frequencies then now()
        else merchant_gain_notification_preferences.updated_at end
    returning * into result;

  -- Remove only deselected channels. Existing provider-accepted messages cannot
  -- be recalled, while waiting jobs/payloads for deselected channels are erased.
  update public.merchant_gain_notification_jobs j set status='cancelled',
    gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
    where j.user_id=p_user and j.merchant_id=p_merchant
      and j.frequency <> all(normalized) and j.status in ('pending','sending','needs_review');
  delete from public.merchant_gain_notification_events e
    where e.user_id=p_user and e.merchant_id=p_merchant and e.frequency <> all(normalized);
  return result;
end $$;

-- Keep the old setter compatible during rolling deploys and intentional code rollback.
create or replace function public.set_merchant_gain_notification_preference(
  p_user text, p_merchant text, p_frequency text
) returns public.merchant_gain_notification_preferences
language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.merchant_gain_notification_preferences; selected text[];
begin
  if p_frequency='disabled' then selected:=array[]::text[];
  else selected:=array[p_frequency]; end if;
  select * into result from public.set_merchant_gain_notification_preferences(p_user,p_merchant,selected);
  return result;
end $$;

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
  update public.merchant_gain_notification_jobs set status='needs_review'
    where status in ('pending','sending') and first_attempt_at < p_now-interval '23 hours';
  update public.merchant_gain_notification_jobs j set status='cancelled',
    gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
    where j.status in ('pending','sending','needs_review') and (
      not public.can_receive_merchant_gain_notification(j.user_id,j.merchant_id)
      or not exists(select 1 from public.merchant_gain_notification_preferences p
        where p.user_id=j.user_id and p.merchant_id=j.merchant_id and j.frequency=any(p.enabled_frequencies))
      or (j.recipient is not null and j.recipient <> (
        select email from public.merchant_users where id=j.user_id))
      or exists(select 1 from jsonb_array_elements(j.gains) g
        where not exists(select 1 from public.leads l where l.id=g->>'leadId'
          and l.status<>'lost' and l.prize_id is not null)));

  -- Serialize selection by account/site while considering each active channel.
  for pref in
    select p.user_id,p.merchant_id,channel.frequency
    from public.merchant_gain_notification_preferences p
    cross join lateral unnest(p.enabled_frequencies) channel(frequency)
    where public.can_receive_merchant_gain_notification(p.user_id,p.merchant_id)
      and exists(select 1 from public.merchant_gain_notification_events e
        where e.user_id=p.user_id and e.merchant_id=p.merchant_id
          and e.frequency=channel.frequency and e.job_id is null
          and (p_lead is null or (channel.frequency='instant' and e.lead_id=p_lead)))
    order by (select min(e.won_at) from public.merchant_gain_notification_events e
      where e.user_id=p.user_id and e.merchant_id=p.merchant_id
        and e.frequency=channel.frequency and e.job_id is null),
      p.user_id,p.merchant_id,channel.frequency
    for update of p skip locked
  loop
    select time_zone into zone from public.merchants where id=pref.merchant_id;
    if not exists(select 1 from pg_timezone_names where name=zone) then zone:='Europe/Paris'; end if;
    local_now:=p_now at time zone zone;
    if pref.frequency='instant' then cutoff:=p_now;
    else
      if local_now::time < time '09:00' then local_now:=local_now-interval '1 day'; end if;
      cutoff:=date_trunc(case pref.frequency when 'daily' then 'day'
        when 'weekly' then 'week' else 'month' end,local_now) at time zone zone;
    end if;
    select e.won_at,e.lead_id into start_at,first_lead from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id
        and e.frequency=pref.frequency and e.job_id is null
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
        'firstName',l.first_name,'lastName',nullif(to_jsonb(l)->>'last_name',''),
        'rewardExpiresAt',l.reward_expires_at,'redeemed',l.status='redeemed')
        order by e.won_at,e.lead_id)
      into selected_ids,all_gains from public.merchant_gain_notification_events e
      join public.leads l on l.id=e.lead_id
      where e.user_id=pref.user_id and e.merchant_id=pref.merchant_id
        and e.frequency=pref.frequency and e.job_id is null
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
          and frequency=pref.frequency
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

create or replace function public.authorize_merchant_gain_notification(p_id uuid,p_token uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.merchant_gain_notification_jobs j
    join public.merchant_gain_notification_preferences p
      on p.user_id=j.user_id and p.merchant_id=j.merchant_id
    join public.merchant_users u on u.id=j.user_id
    where j.id=p_id and j.lease_token=p_token and j.status='sending'
      and j.lease_until>now() and j.frequency=any(p.enabled_frequencies) and u.email=j.recipient
      and public.can_receive_merchant_gain_notification(j.user_id,j.merchant_id)
      and not exists(select 1 from jsonb_array_elements(j.gains) g
        where not exists(select 1 from public.leads l where l.id=g->>'leadId'
          and l.status<>'lost' and l.prize_id is not null)))
$$;

revoke all on function public.set_merchant_gain_notification_preferences(text,text,text[])
  from public,anon,authenticated;
grant execute on function public.set_merchant_gain_notification_preferences(text,text,text[])
  to service_role;

commit;
