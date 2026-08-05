begin;

-- The delay is saved with the existing local campaign settings payload. This keeps
-- the campaign table compatible while making the value available to public RPCs.
alter table public.daily_participation_locks
  add column if not exists locked_until timestamptz;

update public.daily_participation_locks
   set locked_until = ((date_key + 1)::timestamp at time zone 'utc')
 where locked_until is null;

alter table public.daily_participation_locks
  alter column locked_until set not null;

create index if not exists daily_participation_locks_active_idx
  on public.daily_participation_locks (campaign_id, fingerprint_hash, locked_until desc);

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
  v_campaign_id text := left(trim(p_campaign_id), 120);
  v_fingerprint_hash text := left(trim(p_fingerprint_hash), 128);
  v_interval_days integer := 1;
  v_locked_until timestamptz;
begin
  if v_campaign_id = '' or v_fingerprint_hash = '' then
    raise exception 'Parametres de participation invalides';
  end if;

  select case
    when coalesce(campaign_local_settings ->> 'participationIntervalDays', '') ~ '^[0-9]+$'
      then greatest(1, least(365, (campaign_local_settings ->> 'participationIntervalDays')::integer))
    else 1
  end
    into v_interval_days
    from public.campaigns
   where id = v_campaign_id;

  if not found then
    raise exception 'Campagne introuvable';
  end if;

  select locked_until
    into v_locked_until
    from public.daily_participation_locks
   where campaign_id = v_campaign_id
     and fingerprint_hash = v_fingerprint_hash
     and locked_until > v_now
   order by locked_until desc
   limit 1
   for update;

  if found then
    return query select false, greatest(1, ceil(extract(epoch from (v_locked_until - v_now)))::integer);
    return;
  end if;

  insert into public.daily_participation_locks as locks (
    campaign_id,
    date_key,
    fingerprint_hash,
    locked_until,
    created_at
  ) values (
    v_campaign_id,
    v_now::date,
    v_fingerprint_hash,
    v_now + make_interval(days => v_interval_days),
    v_now
  )
  on conflict (campaign_id, date_key, fingerprint_hash) do update
    set locked_until = excluded.locked_until,
        created_at = excluded.created_at;

  return query select true, 0;
end;
$$;

-- Email is the durable identity check. The campaign row lock serializes final
-- submissions for a given campaign, so concurrent tabs cannot both pass it.
create or replace function public.finalize_draw_session_and_create_lead(
  p_session_id text,
  p_lead_id text,
  p_first_name text,
  p_email text,
  p_marketing_consent boolean
)
returns table (
  lead_id text, campaign_id text, first_name text, email text, marketing_consent boolean,
  consent_timestamp timestamptz, prize_id text, status text, created_at timestamptz,
  action_confirmed boolean, redemption_code text, reward_available_at timestamptz,
  reward_expires_at timestamptz, action_index integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.draw_sessions%rowtype;
  v_campaign public.campaigns%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_email text := lower(trim(p_email));
  v_status text := 'lost';
  v_redemption_code text := null;
  v_available_at timestamptz := null;
  v_expires_at timestamptz := null;
  v_previous_participations integer := 0;
  v_interval_days integer := 1;
begin
  select * into v_session from public.draw_sessions where id = p_session_id for update;
  if not found then raise exception 'Session de jeu introuvable'; end if;
  if v_session.status <> 'pending' then raise exception 'Session de jeu deja utilisee ou expiree'; end if;

  if v_session.expires_at <= v_now then
    if v_session.prize_id is not null then
      update public.prizes set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    raise exception 'Session de jeu expiree';
  end if;

  select * into v_campaign from public.campaigns where id = v_session.campaign_id and is_active = true for update;
  if not found then
    if v_session.prize_id is not null then
      update public.prizes set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    raise exception 'Cette animation est momentanement indisponible';
  end if;

  v_interval_days := case
    when coalesce(v_campaign.campaign_local_settings ->> 'participationIntervalDays', '') ~ '^[0-9]+$'
      then greatest(1, least(365, (v_campaign.campaign_local_settings ->> 'participationIntervalDays')::integer))
    else 1
  end;

  if exists (
    select 1
      from public.leads as leads
     where leads.campaign_id = v_session.campaign_id
       and lower(leads.email) = v_email
       and leads.created_at > v_now - make_interval(days => v_interval_days)
  ) then
    if v_session.prize_id is not null then
      update public.prizes
         set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end
       where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    raise exception 'Vous avez deja participe a cette animation. Vous pourrez rejouer dans % jour(s).', v_interval_days;
  end if;

  select count(*) into v_previous_participations
    from public.leads as leads
   where leads.campaign_id = v_session.campaign_id and lower(leads.email) = v_email;

  if v_session.prize_id is not null then
    v_available_at := v_now + make_interval(hours => v_campaign.available_after_hours);
    v_expires_at := v_available_at + make_interval(days => greatest(coalesce(v_campaign.availability_duration_days, 0), 1));
    v_status := 'claimed';
    loop
      v_redemption_code := concat('OK-', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
      exit when not exists (select 1 from public.leads as leads where leads.redemption_code = v_redemption_code);
    end loop;
  end if;

  insert into public.leads (
    id, campaign_id, first_name, email, phone, marketing_consent, consent_timestamp,
    prize_id, status, created_at, action_confirmed, redemption_code, reward_available_at, reward_expires_at
  ) values (
    p_lead_id, v_session.campaign_id, trim(p_first_name), v_email, null,
    coalesce(p_marketing_consent, false), v_now, v_session.prize_id, v_status, v_now,
    false, v_redemption_code, v_available_at, v_expires_at
  );
  update public.draw_sessions set status = 'completed', completed_at = v_now, lead_id = p_lead_id where id = v_session.id;
  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_session.campaign_id,
    p_lead_id, 'lead_created', jsonb_build_object('sessionId', p_session_id), v_now);
  if v_session.prize_id is not null then
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_session.campaign_id,
      p_lead_id, 'prize_won', jsonb_build_object('prizeId', v_session.prize_id, 'sessionId', p_session_id), v_now);
  end if;
  return query select p_lead_id, v_session.campaign_id, trim(p_first_name), v_email,
    coalesce(p_marketing_consent, false), v_now, v_session.prize_id, v_status, v_now,
    false, v_redemption_code, v_available_at, v_expires_at, v_previous_participations;
end;
$$;

revoke all on function public.claim_daily_participation_lock(text, text) from public, anon, authenticated;
revoke all on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_daily_participation_lock(text, text) to service_role;
grant execute on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) to service_role;

commit;
