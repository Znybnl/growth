create table if not exists public.draw_sessions (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  prize_id text references public.prizes(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  completed_at timestamptz,
  lead_id text references public.leads(id) on delete set null
);

create index if not exists draw_sessions_campaign_id_idx
  on public.draw_sessions (campaign_id, status, created_at desc);

create index if not exists draw_sessions_expires_at_idx
  on public.draw_sessions (expires_at)
  where status = 'pending';

comment on table public.draw_sessions is 'Sessions temporaires de jeu public pour réserver un résultat avant collecte des coordonnées.';

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
as $$
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
    select *
      from public.draw_sessions
     where draw_sessions.campaign_id = p_campaign_id
       and status = 'pending'
       and expires_at <= v_now
     for update
  loop
    if v_expired_session.prize_id is not null then
      update public.prizes
         set remaining_quantity =
           case
             when remaining_quantity is null then null
             else remaining_quantity + 1
           end
       where id = v_expired_session.prize_id;
    end if;

    update public.draw_sessions
       set status = 'expired'
     where id = v_expired_session.id;
  end loop;

  select *
    into v_campaign
    from public.campaigns
   where id = p_campaign_id
     and is_active = true
   for update;

  if not found then
    raise exception 'Campagne indisponible';
  end if;

  if v_campaign.is_winning_every_time then
    select random() * coalesce(sum(greatest(probability, 1)), 0)
      into v_roll
      from public.prizes as prizes
     where prizes.campaign_id = p_campaign_id
       and (prizes.remaining_quantity is null or prizes.remaining_quantity > 0);

    if v_roll > 0 then
      for v_prize in
        select *
          from public.prizes as prizes
         where prizes.campaign_id = p_campaign_id
           and (prizes.remaining_quantity is null or prizes.remaining_quantity > 0)
         order by created_at, id
         for update
      loop
        v_cursor := v_cursor + greatest(v_prize.probability, 1);
        if v_roll <= v_cursor then
          v_selected_prize_id := v_prize.id;
          exit;
        end if;
      end loop;
    end if;

    if v_selected_prize_id is null then
      select *
        into v_prize
        from public.prizes as prizes
       where prizes.campaign_id = p_campaign_id
         and (prizes.remaining_quantity is null or prizes.remaining_quantity > 0)
       order by created_at, id
       limit 1
       for update;

      if found then
        v_selected_prize_id := v_prize.id;
      end if;
    end if;
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
    update public.prizes
       set remaining_quantity =
         case
           when remaining_quantity is null then null
           else greatest(remaining_quantity - 1, 0)
         end
     where id = v_selected_prize_id;
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

  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (
    concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    p_campaign_id,
    null,
    'game_played',
    jsonb_build_object('sessionId', p_session_id),
    v_now
  );

  return query
  select
    p_session_id,
    p_campaign_id,
    v_selected_prize_id,
    'pending',
    v_now,
    v_expires_at;
end;
$$;

create or replace function public.finalize_draw_session_and_create_lead(
  p_session_id text,
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
  v_session public.draw_sessions%rowtype;
  v_campaign public.campaigns%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_email text := lower(trim(p_email));
  v_status text := 'lost';
  v_redemption_code text := null;
  v_available_at timestamptz := null;
  v_expires_at timestamptz := null;
  v_previous_participations integer := 0;
begin
  select *
    into v_session
    from public.draw_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'Session de jeu introuvable';
  end if;

  if v_session.status <> 'pending' then
    raise exception 'Session de jeu déjà utilisée ou expirée';
  end if;

  if v_session.expires_at <= v_now then
    if v_session.prize_id is not null then
      update public.prizes
         set remaining_quantity =
           case
             when remaining_quantity is null then null
             else remaining_quantity + 1
           end
       where id = v_session.prize_id;
    end if;

    update public.draw_sessions
       set status = 'expired'
     where id = v_session.id;

    raise exception 'Session de jeu expirée';
  end if;

  select *
    into v_campaign
    from public.campaigns
   where id = v_session.campaign_id
     and is_active = true
   for update;

  if not found then
    raise exception 'Campagne indisponible';
  end if;

  select count(*)
    into v_previous_participations
    from public.leads as leads
   where leads.campaign_id = v_session.campaign_id
     and lower(leads.email) = v_email;

  if v_session.prize_id is not null then
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
    v_session.campaign_id,
    trim(p_first_name),
    v_email,
    null,
    coalesce(p_marketing_consent, false),
    v_now,
    v_session.prize_id,
    v_status,
    v_now,
    false,
    v_redemption_code,
    v_available_at,
    v_expires_at
  );

  update public.draw_sessions
     set status = 'completed',
         completed_at = v_now,
         lead_id = p_lead_id
   where id = v_session.id;

  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (
    concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    v_session.campaign_id,
    p_lead_id,
    'lead_created',
    jsonb_build_object('sessionId', p_session_id),
    v_now
  );

  if v_session.prize_id is not null then
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (
      concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      v_session.campaign_id,
      p_lead_id,
      'prize_won',
      jsonb_build_object('prizeId', v_session.prize_id, 'sessionId', p_session_id),
      v_now
    );
  end if;

  return query
  select
    p_lead_id,
    v_session.campaign_id,
    trim(p_first_name),
    v_email,
    coalesce(p_marketing_consent, false),
    v_now,
    v_session.prize_id,
    v_status,
    v_now,
    false,
    v_redemption_code,
    v_available_at,
    v_expires_at,
    v_previous_participations;
end;
$$;

comment on function public.create_draw_session(text, text)
  is 'Prépare une session de jeu publique, réserve éventuellement un lot et journalise une partie.';

comment on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean)
  is 'Finalise une session de jeu gagnante ou perdante, crée le lead puis enregistre le lot si besoin.';
