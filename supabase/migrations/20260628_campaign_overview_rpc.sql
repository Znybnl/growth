alter table public.campaigns
add column if not exists button_text_size_px integer not null default 18;

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
  with lead_stats as (
    select
      l.campaign_id,
      count(*) as leads_count,
      count(*) filter (where l.prize_id is not null) as wins_count,
      count(*) filter (where l.status = 'redeemed') as redeemed_count,
      count(*) filter (where l.action_confirmed = true) as lead_actions_count,
      coalesce(sum(coalesce(p.estimated_unit_cost, 0)) filter (where l.prize_id is not null), 0) as estimated_spend
    from public.leads l
    left join public.prizes p on p.id = l.prize_id
    group by l.campaign_id
  ),
  event_stats as (
    select
      e.campaign_id,
      count(*) filter (where e.event_type = 'scan') as scans_count,
      count(*) filter (where e.event_type in ('review_confirmed', 'social_clicked')) as event_actions_count,
      count(*) filter (where e.event_type = 'game_played') as games_count
    from public.campaign_events e
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
    greatest(coalesce(es.event_actions_count, 0), coalesce(ls.lead_actions_count, 0)) as actions_count,
    coalesce(es.games_count, 0) as games_count,
    coalesce(ls.wins_count, 0) as wins_count,
    coalesce(ls.redeemed_count, 0) as redeemed_count,
    coalesce(ls.estimated_spend, 0) as estimated_spend
  from public.campaigns c
  left join lead_stats ls on ls.campaign_id = c.id
  left join event_stats es on es.campaign_id = c.id
  where c.merchant_id = p_merchant_id
  order by c.created_at desc;
$$;
