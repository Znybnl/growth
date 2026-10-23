begin;

-- #629: presentation-independent, private weighted selection.
create or replace function public.select_guaranteed_campaign_prize(p_campaign_id text)
returns text
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_prize public.prizes%rowtype;
  v_eligible public.prizes[] := '{}';
  v_total numeric := 0;
  v_cursor numeric := 0;
  v_roll double precision;
begin
  -- Serialize the campaign before locking stocks, for both draw paths.
  perform 1 from public.campaigns as c where c.id = p_campaign_id for update;
  for v_prize in
    select p.* from public.prizes as p
     where p.campaign_id = p_campaign_id
       and p.probability > 0
       and (p.remaining_quantity is null or p.remaining_quantity > 0)
     order by p.created_at, p.id
     for update
  loop
    v_eligible := array_append(v_eligible, v_prize);
    v_total := v_total + v_prize.probability;
  end loop;
  if v_total <= 0 then
    raise exception 'Aucun lot disponible pour ce jeu 100 %% gagnant.';
  end if;
  -- random() is in [0,1). Strict upper bounds preserve fractional weights.
  v_roll := random();
  foreach v_prize in array v_eligible loop
    v_cursor := v_cursor + v_prize.probability;
    if v_roll < (v_cursor / v_total)::double precision then
      return v_prize.id;
    end if;
  end loop;
  -- Final cumulative fraction is exactly 1: no arbitrary prize fallback.
  raise exception 'Tirage indisponible. Veuillez réessayer.';
end;
$function$;
revoke all on function public.select_guaranteed_campaign_prize(text) from public, anon, authenticated;
grant execute on function public.select_guaranteed_campaign_prize(text) to service_role;

-- A scratch ticket is considered played when the player starts scratching,
-- not when the temporary draw session is prepared. Wheel sessions keep their
-- existing behavior because the wheel starts immediately after preparation.
create or replace function public.create_draw_session(
  p_campaign_id text,
  p_session_id text
)
returns table (
  session_id text,
  campaign_id text,
  prize_id text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
as $function$
declare
  v_campaign public.campaigns%rowtype;
  v_prize public.prizes%rowtype;
  v_selected_prize_id text := null;
  v_roll numeric := 0;
  v_cursor numeric := 0;
  v_now timestamptz := timezone('utc', now());
  v_expires_at timestamptz := v_now + interval '15 minutes';
  v_expired_session public.draw_sessions%rowtype;
begin
  for v_expired_session in
    select sessions.*
      from public.draw_sessions as sessions
     where sessions.campaign_id = p_campaign_id
       and sessions.status = 'pending'
       and sessions.expires_at <= v_now
     for update
  loop
    if v_expired_session.prize_id is not null then
      update public.prizes as prizes_to_restore
         set remaining_quantity =
           case
             when prizes_to_restore.remaining_quantity is null then null
             else prizes_to_restore.remaining_quantity + 1
           end
       where prizes_to_restore.id = v_expired_session.prize_id;
    end if;

    update public.draw_sessions as sessions_to_expire
       set status = 'expired'
     where sessions_to_expire.id = v_expired_session.id;
  end loop;

  select campaigns.*
    into v_campaign
    from public.campaigns as campaigns
   where campaigns.id = p_campaign_id
     and campaigns.is_active = true
   for update;

  if not found then
    raise exception 'Campagne indisponible';
  end if;

  if v_campaign.is_winning_every_time then
    v_selected_prize_id := public.select_guaranteed_campaign_prize(p_campaign_id);
  else
    v_roll := random() * 100;

    for v_prize in
      select prizes.*
        from public.prizes as prizes
       where prizes.campaign_id = p_campaign_id
         and (prizes.remaining_quantity is null or prizes.remaining_quantity > 0)
       order by prizes.created_at, prizes.id
       for update
    loop
      v_cursor := v_cursor + v_prize.probability;
      if v_roll <= v_cursor then
        v_selected_prize_id := v_prize.id;
        exit;
      end if;
    end loop;
  end if;

  if v_selected_prize_id is not null then
    update public.prizes as selected_prize
       set remaining_quantity =
         case
           when selected_prize.remaining_quantity is null then null
           else greatest(selected_prize.remaining_quantity - 1, 0)
         end
     where selected_prize.id = v_selected_prize_id;
  end if;

  insert into public.draw_sessions (
    id,
    campaign_id,
    prize_id,
    status,
    created_at,
    expires_at
  ) values (
    p_session_id,
    p_campaign_id,
    v_selected_prize_id,
    'pending',
    v_now,
    v_expires_at
  );

  if v_campaign.game_type = 'wheel' then
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (
      concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      p_campaign_id,
      null,
      'game_played',
      jsonb_build_object('sessionId', p_session_id, 'trigger', 'session_started'),
      v_now
    );
  end if;

  return query
  select
    created_session.id as session_id,
    created_session.campaign_id,
    created_session.prize_id,
    created_session.status,
    created_session.created_at,
    created_session.expires_at
    from public.draw_sessions as created_session
   where created_session.id = p_session_id;
end;
$function$;

create or replace function public.draw_campaign_prize_and_create_lead(
  p_campaign_id text,
  p_lead_id text,
  p_first_name text,
  p_email text,
  p_marketing_consent boolean
)
returns table (
  lead_id text,
  campaign_id text,
  first_name text,
  email text,
  marketing_consent boolean,
  consent_timestamp timestamptz,
  prize_id text,
  status text,
  created_at timestamptz,
  action_confirmed boolean,
  redemption_code text,
  reward_available_at timestamptz,
  reward_expires_at timestamptz,
  action_index integer
)
language plpgsql
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_prize public.prizes%rowtype;
  v_selected_prize_id text := null;
  v_roll numeric := 0;
  v_cursor numeric := 0;
  v_previous_participations integer := 0;
  v_available_at timestamptz := null;
  v_expires_at timestamptz := null;
  v_status text := 'lost';
  v_redemption_code text := null;
  v_now timestamptz := timezone('utc', now());
  v_email text := lower(trim(p_email));
begin
  select *
    into v_campaign
    from public.campaigns
   where id = p_campaign_id
     and is_active = true
   for update;

  if not found then
    raise exception 'Campagne indisponible';
  end if;

  select count(*)
    into v_previous_participations
    from public.leads as leads
   where leads.campaign_id = p_campaign_id
     and lower(leads.email) = v_email;

  if v_campaign.is_winning_every_time then
    v_selected_prize_id := public.select_guaranteed_campaign_prize(p_campaign_id);
  else
    v_roll := random() * 100;

    for v_prize in
      select *
        from public.prizes as prizes
       where prizes.campaign_id = p_campaign_id
         and (prizes.remaining_quantity is null or prizes.remaining_quantity > 0)
       order by created_at, id
       for update
    loop
      v_cursor := v_cursor + v_prize.probability;
      if v_roll <= v_cursor then
        v_selected_prize_id := v_prize.id;
        exit;
      end if;
    end loop;
  end if;

  if v_selected_prize_id is not null then
    select *
      into v_prize
      from public.prizes
     where id = v_selected_prize_id
     for update;

    if v_prize.remaining_quantity is not null then
      update public.prizes
         set remaining_quantity = greatest(v_prize.remaining_quantity - 1, 0)
       where id = v_prize.id;
    end if;

    v_available_at := v_now + make_interval(hours => v_campaign.available_after_hours);
    v_expires_at :=
      case
        when v_campaign.availability_duration_days > 0
          then v_available_at + make_interval(days => v_campaign.availability_duration_days)
        else v_now + make_interval(mins => v_campaign.reward_expiry_minutes)
      end;
    v_status := 'claimed';

    loop
      v_redemption_code := concat('SORA-', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
      exit when not exists (
        select 1
          from public.leads as leads
         where leads.redemption_code = v_redemption_code
      );
    end loop;
  end if;

  insert into public.leads (
    id,
    campaign_id,
    first_name,
    email,
    phone,
    marketing_consent,
    consent_timestamp,
    prize_id,
    status,
    created_at,
    action_confirmed,
    redemption_code,
    reward_available_at,
    reward_expires_at
  ) values (
    p_lead_id,
    p_campaign_id,
    trim(p_first_name),
    v_email,
    null,
    p_marketing_consent,
    v_now,
    v_selected_prize_id,
    v_status,
    v_now,
    false,
    v_redemption_code,
    v_available_at,
    v_expires_at
  );

  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values
    (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), p_campaign_id, p_lead_id, 'lead_created', '{}'::jsonb, v_now),
    (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), p_campaign_id, p_lead_id, 'game_played', '{}'::jsonb, v_now);

  if v_selected_prize_id is not null then
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (
      concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      p_campaign_id,
      p_lead_id,
      'prize_won',
      jsonb_build_object('prizeId', v_selected_prize_id),
      v_now
    );
  end if;

  return query
  select
    p_lead_id,
    p_campaign_id,
    trim(p_first_name),
    v_email,
    p_marketing_consent,
    v_now,
    v_selected_prize_id,
    v_status,
    v_now,
    false,
    v_redemption_code,
    v_available_at,
    v_expires_at,
    v_previous_participations;
end;
$$;

revoke all on function public.create_draw_session(text,text) from public, anon, authenticated;
revoke all on function public.draw_campaign_prize_and_create_lead(text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.create_draw_session(text,text) to service_role;
grant execute on function public.draw_campaign_prize_and_create_lead(text,text,text,text,boolean) to service_role;
commit;
