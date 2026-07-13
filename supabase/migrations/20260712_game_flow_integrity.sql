begin;

-- The editor receives one probability per prize. Keep the aggregate rule in the
-- same transaction as the campaign save, so invalid odds never reach a live game.
create or replace function public.save_campaign_setup(
  p_campaign jsonb,
  p_actions jsonb default '[]'::jsonb,
  p_prizes jsonb default '[]'::jsonb,
  p_settings jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id text := nullif(trim(p_campaign ->> 'id'), '');
  v_merchant_id text := nullif(trim(p_campaign ->> 'merchant_id'), '');
  v_existing_merchant_id text;
  v_total_probability numeric := 0;
  v_is_winning_every_time boolean := coalesce((p_campaign ->> 'is_winning_every_time')::boolean, false);
begin
  if v_campaign_id is null or v_merchant_id is null then
    raise exception 'Identifiant campagne ou marchand manquant';
  end if;

  if not exists (select 1 from public.merchants where id = v_merchant_id) then
    raise exception 'Marchand introuvable';
  end if;

  select coalesce(sum(probability), 0)
    into v_total_probability
    from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(
      id text,
      probability numeric
    );

  if exists (
    select 1
      from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(probability numeric)
     where prize_row.probability < 0 or prize_row.probability > 100
  ) then
    raise exception 'La probabilité de chaque lot doit être comprise entre 0 et 100.';
  end if;

  if not v_is_winning_every_time and v_total_probability > 100 then
    raise exception 'Le total des probabilités ne peut pas dépasser 100 %%.';
  end if;

  if v_is_winning_every_time and v_total_probability <= 0 then
    raise exception 'Ajoutez une probabilité supérieure à 0 pour au moins un lot.';
  end if;

  select merchant_id
    into v_existing_merchant_id
    from public.campaigns
   where id = v_campaign_id
   for update;

  if found and v_existing_merchant_id <> v_merchant_id then
    raise exception 'Campagne introuvable';
  end if;

  -- A gain already attributed must retain a resolvable prize. It can still be
  -- depleted or paused, but it cannot disappear from the configuration.
  if exists (
    select 1
      from public.leads as leads
      join public.prizes as prizes on prizes.id = leads.prize_id
     where prizes.campaign_id = v_campaign_id
       and leads.prize_id is not null
       and not exists (
         select 1
           from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(id text)
          where prize_row.id = prizes.id
       )
  ) then
    raise exception 'Un lot déjà attribué ne peut pas être supprimé. Désactivez la campagne ou conservez ce lot jusqu’à la fin des retraits.';
  end if;

  insert into public.campaigns (
    id, merchant_id, title, subtitle, goal_type, cta_label, success_metric, target_url, is_active,
    accent_ink, accent_paper, accent_signal, game_type, logo_url, logo_size_percent,
    logo_margin_bottom_px, logo_align, background_mode, background_color, background_image_url,
    heading_text_color, heading_font_size_px, heading_font_family, heading_align,
    button_background_color, button_text_color, button_border_color, button_size,
    wheel_rim_color, wheel_win_color, wheel_alternate_win_color, wheel_lose_color,
    wheel_alternate_lose_color, reward_expiry_minutes, purchase_required, available_after_hours,
    availability_duration_days, is_winning_every_time
  ) values (
    v_campaign_id, v_merchant_id, p_campaign ->> 'title', coalesce(p_campaign ->> 'subtitle', ''),
    p_campaign ->> 'goal_type', p_campaign ->> 'cta_label', p_campaign ->> 'success_metric',
    nullif(p_campaign ->> 'target_url', ''), coalesce((p_campaign ->> 'is_active')::boolean, true),
    p_campaign ->> 'accent_ink', p_campaign ->> 'accent_paper', p_campaign ->> 'accent_signal',
    p_campaign ->> 'game_type', nullif(p_campaign ->> 'logo_url', ''),
    coalesce((p_campaign ->> 'logo_size_percent')::integer, 100),
    coalesce((p_campaign ->> 'logo_margin_bottom_px')::integer, 24), p_campaign ->> 'logo_align',
    p_campaign ->> 'background_mode', p_campaign ->> 'background_color',
    nullif(p_campaign ->> 'background_image_url', ''), p_campaign ->> 'heading_text_color',
    coalesce((p_campaign ->> 'heading_font_size_px')::integer, 42), p_campaign ->> 'heading_font_family',
    p_campaign ->> 'heading_align', p_campaign ->> 'button_background_color',
    p_campaign ->> 'button_text_color', p_campaign ->> 'button_border_color', p_campaign ->> 'button_size',
    p_campaign ->> 'wheel_rim_color', p_campaign ->> 'wheel_win_color',
    p_campaign ->> 'wheel_alternate_win_color', p_campaign ->> 'wheel_lose_color',
    p_campaign ->> 'wheel_alternate_lose_color',
    coalesce((p_campaign ->> 'reward_expiry_minutes')::integer, 20),
    coalesce((p_campaign ->> 'purchase_required')::boolean, false),
    coalesce((p_campaign ->> 'available_after_hours')::integer, 24),
    coalesce((p_campaign ->> 'availability_duration_days')::integer, 30),
    v_is_winning_every_time
  )
  on conflict (id) do update set
    title = excluded.title, subtitle = excluded.subtitle, goal_type = excluded.goal_type,
    cta_label = excluded.cta_label, success_metric = excluded.success_metric,
    target_url = excluded.target_url, is_active = excluded.is_active, accent_ink = excluded.accent_ink,
    accent_paper = excluded.accent_paper, accent_signal = excluded.accent_signal,
    game_type = excluded.game_type, logo_url = excluded.logo_url,
    logo_size_percent = excluded.logo_size_percent, logo_margin_bottom_px = excluded.logo_margin_bottom_px,
    logo_align = excluded.logo_align, background_mode = excluded.background_mode,
    background_color = excluded.background_color, background_image_url = excluded.background_image_url,
    heading_text_color = excluded.heading_text_color, heading_font_size_px = excluded.heading_font_size_px,
    heading_font_family = excluded.heading_font_family, heading_align = excluded.heading_align,
    button_background_color = excluded.button_background_color, button_text_color = excluded.button_text_color,
    button_border_color = excluded.button_border_color, button_size = excluded.button_size,
    wheel_rim_color = excluded.wheel_rim_color, wheel_win_color = excluded.wheel_win_color,
    wheel_alternate_win_color = excluded.wheel_alternate_win_color, wheel_lose_color = excluded.wheel_lose_color,
    wheel_alternate_lose_color = excluded.wheel_alternate_lose_color,
    reward_expiry_minutes = excluded.reward_expiry_minutes, purchase_required = excluded.purchase_required,
    available_after_hours = excluded.available_after_hours,
    availability_duration_days = excluded.availability_duration_days,
    is_winning_every_time = excluded.is_winning_every_time;

  delete from public.campaign_actions where campaign_id = v_campaign_id;

  insert into public.campaign_actions (id, campaign_id, position, kind, label, url)
  select id, v_campaign_id, position, kind, label, url
  from jsonb_to_recordset(coalesce(p_actions, '[]'::jsonb)) as action_row(
    id text, campaign_id text, position integer, kind text, label text, url text
  );

  insert into public.prizes (
    id, campaign_id, label, total_quantity, remaining_quantity, probability, estimated_unit_cost
  )
  select id, v_campaign_id, label, total_quantity, remaining_quantity, probability, estimated_unit_cost
  from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(
    id text, campaign_id text, label text, total_quantity integer, remaining_quantity integer,
    probability numeric, estimated_unit_cost numeric
  )
  on conflict (id) do update set
    label = excluded.label,
    total_quantity = excluded.total_quantity,
    remaining_quantity = case
      when excluded.total_quantity is null then null
      when public.prizes.total_quantity is null then excluded.remaining_quantity
      else least(public.prizes.remaining_quantity, excluded.total_quantity)
    end,
    probability = excluded.probability,
    estimated_unit_cost = excluded.estimated_unit_cost;

  delete from public.prizes
   where campaign_id = v_campaign_id
     and id not in (
       select id from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(id text)
     );

  update public.campaigns
     set campaign_local_settings = coalesce(campaign_local_settings, '{}'::jsonb) || coalesce(p_settings, '{}'::jsonb)
   where id = v_campaign_id;

  return v_campaign_id;
end;
$$;

create or replace function public.set_campaign_active_state(
  p_campaign_id text,
  p_merchant_id text,
  p_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.draw_sessions%rowtype;
begin
  if not exists (
    select 1 from public.campaigns
     where id = p_campaign_id and merchant_id = p_merchant_id
     for update
  ) then
    raise exception 'Campagne introuvable';
  end if;

  if not p_is_active then
    for v_session in
      select * from public.draw_sessions
       where campaign_id = p_campaign_id and status = 'pending'
       for update
    loop
      if v_session.prize_id is not null then
        update public.prizes
           set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end
         where id = v_session.prize_id;
      end if;
      update public.draw_sessions set status = 'expired' where id = v_session.id;
    end loop;
  end if;

  update public.campaigns set is_active = p_is_active where id = p_campaign_id and merchant_id = p_merchant_id;
  return p_is_active;
end;
$$;

create or replace function public.redeem_campaign_lead_prize(p_lead_id text)
returns table (
  id text, campaign_id text, first_name text, email text, marketing_consent boolean,
  consent_timestamp timestamptz, prize_id text, status text, created_at timestamptz,
  action_confirmed boolean, redemption_code text, reward_available_at timestamptz, reward_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  select * into v_lead from public.leads where public.leads.id = p_lead_id for update;
  if not found then raise exception 'Lead introuvable'; end if;
  if v_lead.prize_id is null then raise exception 'Aucun lot à retirer'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot déjà retiré'; end if;
  if v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then
    raise exception 'Lot pas encore disponible';
  end if;
  if v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads set status = 'expired' where public.leads.id = p_lead_id;
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_lead.campaign_id, v_lead.id, 'prize_expired', '{}'::jsonb, v_now);
    raise exception 'Lot expiré';
  end if;
  if v_lead.status <> 'claimed' then raise exception 'Lot indisponible'; end if;

  update public.leads set status = 'redeemed' where public.leads.id = p_lead_id;
  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_lead.campaign_id, v_lead.id, 'prize_redeemed', '{}'::jsonb, v_now);

  return query select l.id, l.campaign_id, l.first_name, l.email, l.marketing_consent,
    l.consent_timestamp, l.prize_id, l.status, l.created_at, l.action_confirmed,
    l.redemption_code, l.reward_available_at, l.reward_expires_at
  from public.leads as l where l.id = p_lead_id;
end;
$$;

create or replace function public.reset_campaign_lead_prize(p_lead_id text)
returns table (
  id text, campaign_id text, first_name text, email text, marketing_consent boolean,
  consent_timestamp timestamptz, prize_id text, status text, created_at timestamptz,
  action_confirmed boolean, redemption_code text, reward_available_at timestamptz, reward_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_campaign public.campaigns%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_available_at timestamptz;
begin
  select * into v_lead from public.leads where public.leads.id = p_lead_id for update;
  if not found then raise exception 'Lead introuvable'; end if;
  if v_lead.prize_id is null then raise exception 'Aucun lot à réinitialiser'; end if;
  select * into v_campaign from public.campaigns where public.campaigns.id = v_lead.campaign_id;
  if not found then raise exception 'Campagne introuvable'; end if;
  v_available_at := v_now;
  update public.leads
     set status = 'claimed', reward_available_at = v_available_at,
         reward_expires_at = v_available_at + make_interval(days => greatest(coalesce(v_campaign.availability_duration_days, 0), 1))
   where public.leads.id = p_lead_id;
  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_lead.campaign_id, v_lead.id, 'prize_reset', '{}'::jsonb, v_now);
  return query select l.id, l.campaign_id, l.first_name, l.email, l.marketing_consent,
    l.consent_timestamp, l.prize_id, l.status, l.created_at, l.action_confirmed,
    l.redemption_code, l.reward_available_at, l.reward_expires_at
  from public.leads as l where l.id = p_lead_id;
end;
$$;

create or replace function public.reset_campaign_prize_stock(p_prize_id text)
returns table (id text, campaign_id text, label text, total_quantity integer, remaining_quantity integer, probability numeric, estimated_unit_cost numeric, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize public.prizes%rowtype;
  v_reserved integer := 0;
begin
  select * into v_prize from public.prizes where public.prizes.id = p_prize_id for update;
  if not found then raise exception 'Dotation introuvable'; end if;
  if v_prize.total_quantity is null then
    update public.prizes set remaining_quantity = null where public.prizes.id = p_prize_id;
  else
    select count(*) into v_reserved from public.leads where prize_id = p_prize_id and status = 'claimed';
    v_reserved := v_reserved + (select count(*) from public.draw_sessions where prize_id = p_prize_id and status = 'pending');
    update public.prizes set remaining_quantity = greatest(v_prize.total_quantity - v_reserved, 0) where public.prizes.id = p_prize_id;
  end if;
  return query select p.id, p.campaign_id, p.label, p.total_quantity, p.remaining_quantity, p.probability, p.estimated_unit_cost, p.created_at from public.prizes as p where p.id = p_prize_id;
end;
$$;

-- A paused campaign must not strand a reserved prize. Finalization either creates
-- the lead or releases the reservation in the very same transaction.
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
begin
  select * into v_session from public.draw_sessions where id = p_session_id for update;
  if not found then raise exception 'Session de jeu introuvable'; end if;
  if v_session.status <> 'pending' then raise exception 'Session de jeu déjà utilisée ou expirée'; end if;

  if v_session.expires_at <= v_now then
    if v_session.prize_id is not null then
      update public.prizes set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    raise exception 'Session de jeu expirée';
  end if;

  select * into v_campaign from public.campaigns where id = v_session.campaign_id and is_active = true for update;
  if not found then
    if v_session.prize_id is not null then
      update public.prizes set remaining_quantity = case when remaining_quantity is null then null else remaining_quantity + 1 end where id = v_session.prize_id;
    end if;
    update public.draw_sessions set status = 'expired' where id = v_session.id;
    raise exception 'Cette animation est momentanément indisponible.';
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
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_session.campaign_id, p_lead_id, 'lead_created', jsonb_build_object('sessionId', p_session_id), v_now);
  if v_session.prize_id is not null then
    insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
    values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)), v_session.campaign_id, p_lead_id, 'prize_won', jsonb_build_object('prizeId', v_session.prize_id, 'sessionId', p_session_id), v_now);
  end if;
  return query select p_lead_id, v_session.campaign_id, trim(p_first_name), v_email,
    coalesce(p_marketing_consent, false), v_now, v_session.prize_id, v_status, v_now,
    false, v_redemption_code, v_available_at, v_expires_at, v_previous_participations;
end;
$$;

create or replace function public.release_daily_participation_lock(p_campaign_id text, p_fingerprint_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.daily_participation_locks
   where campaign_id = left(trim(p_campaign_id), 120)
     and fingerprint_hash = left(trim(p_fingerprint_hash), 128)
     and date_key = (timezone('utc', now()))::date;
$$;

revoke all on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.set_campaign_active_state(text, text, boolean) from public, anon, authenticated;
revoke all on function public.redeem_campaign_lead_prize(text) from public, anon, authenticated;
revoke all on function public.reset_campaign_lead_prize(text) from public, anon, authenticated;
revoke all on function public.reset_campaign_prize_stock(text) from public, anon, authenticated;
revoke all on function public.release_daily_participation_lock(text, text) from public, anon, authenticated;
revoke all on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.set_campaign_active_state(text, text, boolean) to service_role;
grant execute on function public.redeem_campaign_lead_prize(text) to service_role;
grant execute on function public.reset_campaign_lead_prize(text) to service_role;
grant execute on function public.reset_campaign_prize_stock(text) to service_role;
grant execute on function public.release_daily_participation_lock(text, text) to service_role;
grant execute on function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) to service_role;

commit;
