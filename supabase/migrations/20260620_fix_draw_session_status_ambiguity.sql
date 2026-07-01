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
    select *
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

  select *
    into v_campaign
    from public.campaigns as campaigns
   where campaigns.id = p_campaign_id
     and campaigns.is_active = true
   for update;

  if not found then
    raise exception 'Campagne indisponible';
  end if;

  if v_campaign.is_winning_every_time then
    select random() * coalesce(sum(greatest(prizes.probability, 1)), 0)
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
         order by prizes.created_at, prizes.id
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
       order by prizes.created_at, prizes.id
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
    'pending'::text,
    v_now,
    v_expires_at;
end;
$function$;
