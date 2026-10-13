begin;
-- Existing persisted game events are the evidence of play, not prepared sessions.
-- Contacts are legacy evidence only; lead_created links them to the same session.
create or replace view public.campaign_participations with (security_invoker = true) as
with lead_sessions as not materialized (
  select campaign_id, lead_id, min(metadata ->> 'sessionId') as session_id
  from public.campaign_events
  where event_type in ('lead_created', 'game_played') and lead_id is not null
    and nullif(metadata ->> 'sessionId', '') is not null
  group by campaign_id, lead_id
), evidence as (
  select e.campaign_id,
    case when nullif(e.metadata ->> 'sessionId', '') is not null
      then 'session:' || (e.metadata ->> 'sessionId')
      when ls.session_id is not null then 'session:' || ls.session_id
      when e.lead_id is not null then 'lead:' || e.lead_id
      else 'event:' || e.id end as participation_id,
    e.created_at
  from public.campaign_events e
  left join lead_sessions ls on ls.campaign_id = e.campaign_id and ls.lead_id = e.lead_id
  where e.event_type = 'game_played'
  union all
  select l.campaign_id,
    case when ls.session_id is not null then 'session:' || ls.session_id
      else 'lead:' || l.id end, l.created_at
  from public.leads l
  left join lead_sessions ls on ls.campaign_id = l.campaign_id and ls.lead_id = l.id
)
select campaign_id, participation_id, min(created_at) as created_at
from evidence group by campaign_id, participation_id;
revoke all on public.campaign_participations from public, anon, authenticated;
grant select on public.campaign_participations to service_role;

create index if not exists campaign_events_participation_session_496_idx
  on public.campaign_events(campaign_id, (metadata ->> 'sessionId'))
  where event_type = 'game_played';

create or replace function public.record_draw_session_participation(p_campaign_id text, p_session_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_session public.draw_sessions%rowtype;
begin
  select * into v_session from public.draw_sessions
    where id = p_session_id and campaign_id = p_campaign_id for update;
  if not found then return false; end if;
  -- The form may finalize while the first-touch request is still in flight.
  -- That real finalized contact is already the same participation in the view.
  if v_session.status = 'completed' and exists(select 1 from public.leads
    where id = v_session.lead_id and campaign_id = p_campaign_id) then return true; end if;
  if exists(select 1 from public.campaign_events where campaign_id = p_campaign_id
      and event_type = 'game_played' and metadata ->> 'sessionId' = p_session_id) then
    return true;
  end if;
  if v_session.status <> 'pending' or v_session.expires_at <= now() or not exists(
    select 1 from public.campaigns where id = p_campaign_id and is_active and game_type = 'scratch'
  ) then return false; end if;
  insert into public.campaign_events(id, campaign_id, event_type, metadata, created_at)
  values ('evt-' || md5(random()::text || clock_timestamp()::text), p_campaign_id, 'game_played',
    jsonb_build_object('sessionId', p_session_id, 'trigger', 'first_touch'), now());
  return true;
end;
$$;
revoke all on function public.record_draw_session_participation(text,text) from public, anon, authenticated;
grant execute on function public.record_draw_session_participation(text,text) to service_role;

create or replace function public.get_merchant_participation_activity(p_merchant_id text)
returns table(label text, scans bigint, participations bigint)
language sql security definer set search_path = public as $$
  with days as (select generate_series((now() at time zone 'UTC')::date - 29,
    (now() at time zone 'UTC')::date, interval '1 day') as day),
  plays as (select (p.created_at at time zone 'UTC')::date as day, count(*) as value
    from public.campaign_participations p join public.campaigns c on c.id = p.campaign_id
    where c.merchant_id = p_merchant_id and p.created_at >=
      ((now() at time zone 'UTC')::date - 29)::timestamp at time zone 'UTC' group by 1),
  scans as (select (e.created_at at time zone 'UTC')::date as day, count(*) as value
    from public.campaign_events e join public.campaigns c on c.id = e.campaign_id
    where c.merchant_id = p_merchant_id and e.event_type = 'scan' and e.created_at >=
      ((now() at time zone 'UTC')::date - 29)::timestamp at time zone 'UTC' group by 1)
  select to_char(days.day, 'YYYY-MM-DD'), coalesce(scans.value,0), coalesce(plays.value,0)
    from days left join plays on plays.day = days.day::date
    left join scans on scans.day = days.day::date order by days.day;
$$;
revoke all on function public.get_merchant_participation_activity(text) from public, anon, authenticated;
grant execute on function public.get_merchant_participation_activity(text) to service_role;

create or replace function public.get_merchant_participation_counts(p_merchant_id text)
returns table(campaign_id text, participations bigint)
language sql security definer set search_path = public as $$
  select c.id, count(p.participation_id)
  from public.campaigns c left join public.campaign_participations p on p.campaign_id = c.id
  where c.merchant_id = p_merchant_id group by c.id;
$$;
revoke all on function public.get_merchant_participation_counts(text) from public, anon, authenticated;
grant execute on function public.get_merchant_participation_counts(text) to service_role;

create or replace function public.get_merchant_campaign_overview(p_merchant_id text)
returns table (
  id text,
  merchant_id text,
  title text,
  subtitle text,
  goal_type text,
  cta_label text,
  success_metric text,
  target_url text,
  is_active boolean,
  created_at timestamptz,
  accent_ink text,
  accent_paper text,
  accent_signal text,
  game_type text,
  logo_url text,
  logo_size_percent integer,
  logo_margin_bottom_px integer,
  logo_align text,
  background_mode text,
  background_color text,
  background_image_url text,
  heading_text_color text,
  heading_font_size_px integer,
  heading_font_family text,
  heading_align text,
  button_background_color text,
  button_text_color text,
  button_border_color text,
  button_size text,
  button_text_size_px integer,
  wheel_rim_color text,
  wheel_win_color text,
  wheel_alternate_win_color text,
  wheel_lose_color text,
  wheel_alternate_lose_color text,
  reward_expiry_minutes integer,
  purchase_required boolean,
  available_after_hours integer,
  availability_duration_days integer,
  is_winning_every_time boolean,
  scans_count bigint,
  leads_count bigint,
  actions_count bigint,
  games_count bigint,
  wins_count bigint,
  redeemed_count bigint,
  estimated_spend numeric
)
language sql
security definer
set search_path = public
as $$
  with merchant_campaigns as (
    select c.*
    from public.campaigns c
    where c.merchant_id = p_merchant_id
  ),
  lead_stats as (
    select
      l.campaign_id,
      count(*) as leads_count,
      count(*) filter (where l.prize_id is not null) as wins_count,
      count(*) filter (where l.status = 'redeemed') as redeemed_count,
      coalesce(sum(coalesce(p.estimated_unit_cost, 0)) filter (where l.prize_id is not null), 0) as estimated_spend
    from public.leads l
    join merchant_campaigns mc on mc.id = l.campaign_id
    left join public.prizes p on p.id = l.prize_id
    group by l.campaign_id
  ),
  event_stats as (
    select
      e.campaign_id,
      count(*) filter (where e.event_type = 'scan') as scans_count,
      count(*) filter (where e.event_type = 'review_clicked') as event_actions_count,
      count(*) filter (where e.event_type = 'game_played') as games_count
    from public.campaign_events e
    join merchant_campaigns mc on mc.id = e.campaign_id
    group by e.campaign_id
  )
  select
    c.id,
    c.merchant_id,
    c.title,
    c.subtitle,
    c.goal_type,
    c.cta_label,
    c.success_metric,
    c.target_url,
    c.is_active,
    c.created_at,
    c.accent_ink,
    c.accent_paper,
    c.accent_signal,
    c.game_type,
    c.logo_url,
    c.logo_size_percent,
    c.logo_margin_bottom_px,
    c.logo_align,
    c.background_mode,
    c.background_color,
    c.background_image_url,
    c.heading_text_color,
    c.heading_font_size_px,
    c.heading_font_family,
    c.heading_align,
    c.button_background_color,
    c.button_text_color,
    c.button_border_color,
    c.button_size,
    c.button_text_size_px,
    c.wheel_rim_color,
    c.wheel_win_color,
    c.wheel_alternate_win_color,
    c.wheel_lose_color,
    c.wheel_alternate_lose_color,
    c.reward_expiry_minutes,
    c.purchase_required,
    c.available_after_hours,
    c.availability_duration_days,
    c.is_winning_every_time,
    coalesce(es.scans_count, 0) as scans_count,
    coalesce(ls.leads_count, 0) as leads_count,
    coalesce(es.event_actions_count, 0) as actions_count,
    (select count(*) from public.campaign_participations cp where cp.campaign_id = c.id) as games_count,
    coalesce(ls.wins_count, 0) as wins_count,
    coalesce(ls.redeemed_count, 0) as redeemed_count,
    coalesce(ls.estimated_spend, 0) as estimated_spend
  from merchant_campaigns c
  left join lead_stats ls on ls.campaign_id = c.id
  left join event_stats es on es.campaign_id = c.id
  order by c.created_at desc;
$$;

-- A reset reopens a reward. The current KPI already relies on lead.status,
-- while the daily chart must also ignore earlier redemption events for that reward.
create or replace function public.get_campaign_data_summary(p_campaign_id text)
returns table (
  scans_count bigint,
  leads_count bigint,
  actions_count bigint,
  games_count bigint,
  wins_count bigint,
  redeemed_count bigint,
  estimated_spend numeric,
  daily_stats jsonb,
  action_volumes jsonb
)
language sql
security definer
set search_path = public
as $$
  with
    lead_stats as (
      select
        count(*) as leads_count,
        count(*) filter (where l.prize_id is not null) as wins_count,
        count(*) filter (where l.status = 'redeemed') as redeemed_count,
        coalesce(sum(coalesce(p.estimated_unit_cost, 0)) filter (where l.prize_id is not null), 0) as estimated_spend
      from public.leads l
      left join public.prizes p on p.id = l.prize_id
      where l.campaign_id = p_campaign_id
    ),
    event_stats as (
      select
        count(*) filter (where e.event_type = 'scan') as scans_count,
        count(*) filter (where e.event_type = 'review_clicked') as actions_count,
        count(*) filter (where e.event_type = 'game_played') as games_count
      from public.campaign_events e
      where e.campaign_id = p_campaign_id
    ),
    daily_participations as (
      select (l.created_at at time zone 'UTC')::date as day, count(*) as value
      from public.campaign_participations l
      where l.campaign_id = p_campaign_id
        and l.created_at >= ((now() at time zone 'UTC')::date - 6)::timestamp at time zone 'UTC'
      group by 1
    ),
    daily_redeemed as (
      select date_trunc('day', latest_redemption.created_at)::date as day, count(*) as value
      from public.leads l
      cross join lateral (
        select e.created_at
        from public.campaign_events e
        where e.lead_id = l.id
          and e.event_type = 'prize_redeemed'
        order by e.created_at desc
        limit 1
      ) latest_redemption
      where l.campaign_id = p_campaign_id
        and l.status = 'redeemed'
        and latest_redemption.created_at >= timezone('utc', now()) - interval '6 days'
      group by 1
    ),
    daily as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'label', to_char(days.day, 'YYYY-MM-DD'),
            'participations', coalesce(dp.value, 0),
            'redeemed', coalesce(dr.value, 0)
          ) order by days.day
        ),
        '[]'::jsonb
      ) as value
      from generate_series(
        timezone('utc', now())::date - 6,
        timezone('utc', now())::date,
        interval '1 day'
      ) as days(day)
      left join daily_participations dp on dp.day = days.day::date
      left join daily_redeemed dr on dr.day = days.day::date
    ),
    ordered_leads as (
      select row_number() over (
        partition by lower(l.email)
        order by l.created_at asc, l.id asc
      ) - 1 as action_index
      from public.leads l
      where l.campaign_id = p_campaign_id
    ),
    action_count as (
      select count(*)::integer as value
      from public.campaign_actions
      where campaign_id = p_campaign_id
    ),
    action_volume_rows as (
      select ol.action_index, count(*) as value
      from ordered_leads ol
      cross join action_count ac
      where ol.action_index < ac.value
      group by ol.action_index
    ),
    action_volume_json as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('actionIndex', action_index, 'value', value)
          order by action_index
        ),
        '[]'::jsonb
      ) as value
      from action_volume_rows
    )
  select
    coalesce(es.scans_count, 0),
    coalesce(ls.leads_count, 0),
    coalesce(es.actions_count, 0),
    (select count(*) from public.campaign_participations cp where cp.campaign_id = p_campaign_id),
    coalesce(ls.wins_count, 0),
    coalesce(ls.redeemed_count, 0),
    coalesce(ls.estimated_spend, 0),
    daily.value,
    action_volume_json.value
  from lead_stats ls
  cross join event_stats es
  cross join daily
  cross join action_volume_json;
$$;

revoke all on function public.get_campaign_data_summary(text) from public, anon, authenticated;
grant execute on function public.get_campaign_data_summary(text) to service_role;
revoke all on function public.get_merchant_campaign_overview(text) from public, anon, authenticated;
grant execute on function public.get_merchant_campaign_overview(text) to service_role;
commit;
