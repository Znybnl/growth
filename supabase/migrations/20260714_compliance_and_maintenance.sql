begin;

alter table public.merchants
  add column if not exists time_zone text not null default 'Europe/Paris';

alter table public.leads
  alter column consent_timestamp drop not null;

alter table public.leads
  add column if not exists prize_label_snapshot text,
  add column if not exists prize_usage_conditions_snapshot text;

update public.leads as leads
   set prize_label_snapshot = prizes.label
  from public.prizes as prizes
 where leads.prize_id = prizes.id
   and leads.prize_label_snapshot is null;

update public.leads as leads
   set prize_usage_conditions_snapshot = nullif(
     coalesce(campaigns.campaign_local_settings -> 'prizeSettings' -> leads.prize_id ->> 'usageConditions', ''),
     ''
   )
  from public.campaigns as campaigns
 where campaigns.id = leads.campaign_id
   and leads.prize_id is not null
   and leads.prize_usage_conditions_snapshot is null;

-- A timestamp is evidence of an explicit opt-in, not merely of participation.
create or replace function public.normalize_lead_consent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.marketing_consent then
    new.consent_timestamp := null;
  elsif new.consent_timestamp is null then
    new.consent_timestamp := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists leads_normalize_consent on public.leads;
create trigger leads_normalize_consent
  before insert or update of marketing_consent, consent_timestamp on public.leads
  for each row execute function public.normalize_lead_consent();

-- Freeze the promise made to the player. Later campaign edits cannot change the
-- label or the conditions attached to an already attributed gain.
create or replace function public.snapshot_lead_prize()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_settings jsonb;
begin
  if new.prize_id is null then
    return new;
  end if;

  select label into new.prize_label_snapshot from public.prizes where id = new.prize_id;
  select campaign_local_settings into v_settings from public.campaigns where id = new.campaign_id;
  new.prize_usage_conditions_snapshot := nullif(
    coalesce(v_settings -> 'prizeSettings' -> new.prize_id ->> 'usageConditions', ''),
    ''
  );
  return new;
end;
$$;

drop trigger if exists leads_snapshot_prize on public.leads;
create trigger leads_snapshot_prize
  before insert on public.leads
  for each row execute function public.snapshot_lead_prize();

alter table public.campaign_events drop constraint if exists campaign_events_event_type_check;
alter table public.campaign_events add constraint campaign_events_event_type_check check (
  event_type in (
    'scan', 'form_started', 'lead_created', 'review_clicked', 'review_confirmed',
    'social_clicked', 'game_played', 'game_lost', 'prize_won', 'prize_redeemed',
    'prize_expired', 'prize_reset'
  )
);

create or replace function public.claim_daily_participation_lock(
  p_campaign_id text,
  p_fingerprint_hash text
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_timezone text := 'Europe/Paris';
  v_date_key date;
  v_next_midnight timestamptz;
  v_inserted integer := 0;
begin
  if p_campaign_id is null or length(trim(p_campaign_id)) = 0 or
     p_fingerprint_hash is null or length(trim(p_fingerprint_hash)) = 0 then
    raise exception 'ParamÃ¨tres de participation invalides';
  end if;

  select coalesce(nullif(merchants.time_zone, ''), 'Europe/Paris')
    into v_timezone
    from public.campaigns
    join public.merchants on merchants.id = campaigns.merchant_id
   where campaigns.id = trim(p_campaign_id);
  if not found then raise exception 'Campagne introuvable'; end if;

  v_date_key := timezone(v_timezone, v_now)::date;
  v_next_midnight := ((v_date_key + 1)::timestamp at time zone v_timezone);

  insert into public.daily_participation_locks (campaign_id, date_key, fingerprint_hash, created_at)
  values (left(trim(p_campaign_id), 120), v_date_key, left(trim(p_fingerprint_hash), 128), v_now)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  return query select v_inserted = 1,
    case when v_inserted = 1 then 0 else greatest(1, ceil(extract(epoch from (v_next_midnight - v_now)))::integer) end;
end;
$$;

create or replace function public.purge_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.draw_sessions%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_sessions integer := 0;
  v_locks integer := 0;
  v_limits integer := 0;
  v_identities integer := 0;
begin
  for v_session in
    select * from public.draw_sessions
     where status = 'pending' and expires_at <= v_now
     for update
  loop
    if v_session.prize_id is not null then
      update public.prizes
         set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end
       where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    v_sessions := v_sessions + 1;
  end loop;

  delete from public.daily_participation_locks where created_at < v_now - interval '8 days';
  get diagnostics v_locks = row_count;
  delete from public.public_rate_limits where reset_at < v_now - interval '2 days';
  get diagnostics v_limits = row_count;
  delete from public.player_campaign_identities where expires_at < v_now;
  get diagnostics v_identities = row_count;

  return jsonb_build_object(
    'expiredSessions', v_sessions,
    'dailyLocks', v_locks,
    'rateLimits', v_limits,
    'playerIdentities', v_identities
  );
end;
$$;

revoke all on function public.claim_daily_participation_lock(text, text) from public, anon, authenticated;
revoke all on function public.purge_operational_data() from public, anon, authenticated;
grant execute on function public.claim_daily_participation_lock(text, text) to service_role;
grant execute on function public.purge_operational_data() to service_role;

commit;

