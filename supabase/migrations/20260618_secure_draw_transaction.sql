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

comment on function public.draw_campaign_prize_and_create_lead(text, text, text, text, boolean)
  is 'Tirage serveur transactionnel : verrouille les lots, attribue un gain sans sur-allocation et crée le lead.';
