begin;

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
begin
  if v_campaign_id is null or v_merchant_id is null then
    raise exception 'Identifiant campagne ou marchand manquant';
  end if;

  if not exists (select 1 from public.merchants where id = v_merchant_id) then
    raise exception 'Marchand introuvable';
  end if;

  select merchant_id
    into v_existing_merchant_id
    from public.campaigns
   where id = v_campaign_id
   for update;

  if found and v_existing_merchant_id <> v_merchant_id then
    raise exception 'Campagne introuvable';
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
    coalesce((p_campaign ->> 'is_winning_every_time')::boolean, false)
  )
  on conflict (id) do update set
    title = excluded.title,
    subtitle = excluded.subtitle,
    goal_type = excluded.goal_type,
    cta_label = excluded.cta_label,
    success_metric = excluded.success_metric,
    target_url = excluded.target_url,
    is_active = excluded.is_active,
    accent_ink = excluded.accent_ink,
    accent_paper = excluded.accent_paper,
    accent_signal = excluded.accent_signal,
    game_type = excluded.game_type,
    logo_url = excluded.logo_url,
    logo_size_percent = excluded.logo_size_percent,
    logo_margin_bottom_px = excluded.logo_margin_bottom_px,
    logo_align = excluded.logo_align,
    background_mode = excluded.background_mode,
    background_color = excluded.background_color,
    background_image_url = excluded.background_image_url,
    heading_text_color = excluded.heading_text_color,
    heading_font_size_px = excluded.heading_font_size_px,
    heading_font_family = excluded.heading_font_family,
    heading_align = excluded.heading_align,
    button_background_color = excluded.button_background_color,
    button_text_color = excluded.button_text_color,
    button_border_color = excluded.button_border_color,
    button_size = excluded.button_size,
    wheel_rim_color = excluded.wheel_rim_color,
    wheel_win_color = excluded.wheel_win_color,
    wheel_alternate_win_color = excluded.wheel_alternate_win_color,
    wheel_lose_color = excluded.wheel_lose_color,
    wheel_alternate_lose_color = excluded.wheel_alternate_lose_color,
    reward_expiry_minutes = excluded.reward_expiry_minutes,
    purchase_required = excluded.purchase_required,
    available_after_hours = excluded.available_after_hours,
    availability_duration_days = excluded.availability_duration_days,
    is_winning_every_time = excluded.is_winning_every_time;

  delete from public.campaign_actions where campaign_id = v_campaign_id;

  insert into public.campaign_actions (id, campaign_id, position, kind, label, url)
  select id, v_campaign_id, position, kind, label, url
  from jsonb_to_recordset(coalesce(p_actions, '[]'::jsonb)) as action_row(
    id text,
    campaign_id text,
    position integer,
    kind text,
    label text,
    url text
  );

  insert into public.prizes (
    id, campaign_id, label, total_quantity, remaining_quantity, probability, estimated_unit_cost
  )
  select
    id,
    v_campaign_id,
    label,
    total_quantity,
    remaining_quantity,
    probability,
    estimated_unit_cost
  from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(
    id text,
    campaign_id text,
    label text,
    total_quantity integer,
    remaining_quantity integer,
    probability numeric,
    estimated_unit_cost numeric
  )
  on conflict (id) do update set
    label = excluded.label,
    total_quantity = excluded.total_quantity,
    remaining_quantity = case
      when excluded.total_quantity is null then null
      when public.prizes.total_quantity is null then excluded.remaining_quantity
      else public.prizes.remaining_quantity
    end,
    probability = excluded.probability,
    estimated_unit_cost = excluded.estimated_unit_cost;

  delete from public.prizes
   where campaign_id = v_campaign_id
     and id not in (
       select id
       from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(id text)
     );

  update public.campaigns
     set campaign_local_settings = coalesce(campaign_local_settings, '{}'::jsonb) || coalesce(p_settings, '{}'::jsonb)
   where id = v_campaign_id;

  return v_campaign_id;
end;
$$;

revoke all on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) to service_role;

commit;
