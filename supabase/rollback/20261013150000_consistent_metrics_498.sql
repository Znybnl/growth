begin;
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
create or replace function public.get_merchant_gain_notification_digest_context(
  p_merchant_id text,
  p_period_start timestamptz,
  p_period_end timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if p_period_start is null or p_period_end is null or p_period_end <= p_period_start then
    raise exception 'Période de synthèse invalide';
  end if;

  select jsonb_build_object(
    'redeemedCount', coalesce((
      select count(*)::integer
      from public.leads l
      join public.campaigns c on c.id = l.campaign_id
      where c.merchant_id = p_merchant_id
        and l.status = 'redeemed'
        and l.prize_id is not null
        and l.redeemed_at >= p_period_start
        and l.redeemed_at < p_period_end
    ), 0),
    'stocks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'campaignTitle', c.title,
          'prizeLabel', p.label,
          'totalQuantity', p.total_quantity,
          'remainingQuantity', p.remaining_quantity
        ) order by c.title, p.label, p.id
      )
      from public.campaigns c
      join public.prizes p on p.campaign_id = c.id
      where c.merchant_id = p_merchant_id
        and c.is_active = true
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.get_merchant_campaign_overview(text),public.get_campaign_data_summary(text),
 public.get_merchant_gain_notification_digest_context(text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.get_merchant_campaign_overview(text),public.get_campaign_data_summary(text),
 public.get_merchant_gain_notification_digest_context(text,timestamptz,timestamptz) to service_role;

drop trigger if exists leads_redemption_timestamp_498 on public.leads;
drop function if exists public.sync_redemption_timestamp_498();
drop function if exists public.record_marketing_click(text,text,text,text,text);
drop function if exists public.get_platform_operational_metrics();
drop function if exists public.get_merchant_metric_details(text);
drop function if exists public.get_campaign_metric_counts(text[]);
drop view if exists public.campaign_effective_redemptions;
drop index if exists public.campaign_events_redemption_evidence_498_idx;
create or replace function public.redeem_cashier_lead_prize(
  p_lead_id text,
  p_merchant_id text,
  p_operator_user_id text,
  p_purchase_confirmed boolean default false,
  p_idempotency_key text default null
)
returns table (
  id text, campaign_id text, first_name text, email text, prize_id text, status text,
  redemption_code text, reward_available_at timestamptz, reward_expires_at timestamptz,
  redeemed_at timestamptz, purchase_verified boolean
)
language plpgsql security definer set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_campaign public.campaigns%rowtype;
  v_prize public.prizes%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_existing_audit public.cashier_redemption_audits%rowtype;
  v_audit_id text := concat('cashier-', substr(md5(random()::text || clock_timestamp()::text), 1, 16));
begin
  if p_idempotency_key is not null then
    select * into v_existing_audit from public.cashier_redemption_audits as a
     where a.merchant_id = p_merchant_id and a.idempotency_key = p_idempotency_key and a.status = 'redeemed' limit 1;
    if found then
      return query select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
        l.redemption_code, l.reward_available_at, l.reward_expires_at, l.redeemed_at, l.purchase_verified
        from public.leads l where l.id = v_existing_audit.lead_id;
      return;
    end if;
  end if;

  select l.* into v_lead from public.leads l
    join public.campaigns c on c.id = l.campaign_id and c.merchant_id = p_merchant_id
   where l.id = p_lead_id for update;
  if not found then raise exception 'Gain introuvable'; end if;
  select c.* into v_campaign from public.campaigns c where c.id = v_lead.campaign_id;
  if v_lead.prize_id is null then raise exception 'Aucun lot Ã  retirer'; end if;
  select p.* into v_prize from public.prizes p where p.id = v_lead.prize_id;
  if not found then raise exception 'Lot introuvable'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot dÃ©jÃ  retirÃ©'; end if;
  if v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then raise exception 'Lot pas encore disponible'; end if;
  if v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads set status = 'expired' where id = v_lead.id;
    raise exception 'Lot expirÃ©';
  end if;
  if v_lead.status <> 'claimed' then raise exception 'Lot indisponible'; end if;
  if v_prize.purchase_required and not coalesce(p_purchase_confirmed, false) then raise exception 'Achat Ã  confirmer avant le retrait'; end if;

  update public.leads set status = 'redeemed', redeemed_at = v_now,
    redeemed_by_user_id = nullif(p_operator_user_id, ''), purchase_verified = coalesce(p_purchase_confirmed, false)
   where id = v_lead.id;
  insert into public.cashier_redemption_audits (
    id, merchant_id, campaign_id, lead_id, redemption_code, operator_user_id,
    status, purchase_verified, idempotency_key, reason, created_at
  ) values (
    v_audit_id, p_merchant_id, v_lead.campaign_id, v_lead.id, v_lead.redemption_code,
    nullif(p_operator_user_id, ''), 'redeemed', coalesce(p_purchase_confirmed, false),
    nullif(p_idempotency_key, ''), 'cashier_validation', v_now
  );
  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    v_lead.campaign_id, v_lead.id, 'prize_redeemed',
    jsonb_build_object('source', 'cashier', 'operatorUserId', p_operator_user_id, 'auditId', v_audit_id), v_now);
  return query select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
    l.redemption_code, l.reward_available_at, l.reward_expires_at, l.redeemed_at, l.purchase_verified
    from public.leads l where l.id = v_lead.id;
end;
$$;

create or replace function public.redeem_cashier_lead_prize_force(
  p_lead_id text, p_merchant_id text, p_operator_user_id text,
  p_purchase_confirmed boolean default false, p_idempotency_key text default null,
  p_force_redemption boolean default false, p_force_reason text default null
)
returns table (
  id text, campaign_id text, first_name text, email text, prize_id text, status text,
  redemption_code text, reward_available_at timestamptz, reward_expires_at timestamptz,
  redeemed_at timestamptz, purchase_verified boolean
)
language plpgsql security definer set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_prize public.prizes%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_existing_audit public.cashier_redemption_audits%rowtype;
  v_audit_id text := concat('cashier-', substr(md5(random()::text || clock_timestamp()::text), 1, 16));
  v_force boolean := coalesce(p_force_redemption, false);
  v_force_reason text := left(trim(coalesce(p_force_reason, '')), 500);
begin
  if v_force and length(v_force_reason) < 8 then raise exception 'Un motif dâ€™au moins 8 caractÃ¨res est requis pour forcer un retrait hors pÃ©riode'; end if;
  if p_idempotency_key is not null then
    select * into v_existing_audit from public.cashier_redemption_audits as a
     where a.merchant_id = p_merchant_id and a.idempotency_key = p_idempotency_key and a.status = 'redeemed' limit 1;
    if found then
      return query select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
        l.redemption_code, l.reward_available_at, l.reward_expires_at, l.redeemed_at, l.purchase_verified
        from public.leads l where l.id = v_existing_audit.lead_id;
      return;
    end if;
  end if;
  select l.* into v_lead from public.leads l
    join public.campaigns c on c.id = l.campaign_id and c.merchant_id = p_merchant_id
   where l.id = p_lead_id for update;
  if not found then raise exception 'Gain introuvable'; end if;
  if v_lead.prize_id is null then raise exception 'Aucun lot Ã  retirer'; end if;
  select p.* into v_prize from public.prizes p where p.id = v_lead.prize_id;
  if not found then raise exception 'Lot introuvable'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot dÃ©jÃ  retirÃ©'; end if;
  if v_force and v_lead.status <> 'expired'
     and (v_lead.reward_available_at is null or v_lead.reward_available_at <= v_now)
     and (v_lead.reward_expires_at is null or v_lead.reward_expires_at >= v_now) then
    raise exception 'Le forÃ§age est rÃ©servÃ© aux lots hors pÃ©riode de validitÃ©';
  end if;
  if not v_force and v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then raise exception 'Lot pas encore disponible'; end if;
  if not v_force and v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads set status = 'expired' where id = v_lead.id;
    raise exception 'Lot expirÃ©';
  end if;
  if v_lead.status not in ('claimed', 'expired') then raise exception 'Lot indisponible'; end if;
  if v_prize.purchase_required and not coalesce(p_purchase_confirmed, false) then raise exception 'Achat Ã  confirmer avant le retrait'; end if;
  update public.leads set status = 'redeemed', redeemed_at = v_now,
    redeemed_by_user_id = nullif(p_operator_user_id, ''), purchase_verified = coalesce(p_purchase_confirmed, false)
   where id = v_lead.id;
  insert into public.cashier_redemption_audits (
    id, merchant_id, campaign_id, lead_id, redemption_code, operator_user_id,
    status, purchase_verified, idempotency_key, reason, created_at
  ) values (
    v_audit_id, p_merchant_id, v_lead.campaign_id, v_lead.id, v_lead.redemption_code,
    nullif(p_operator_user_id, ''), 'redeemed', coalesce(p_purchase_confirmed, false), nullif(p_idempotency_key, ''),
    case when v_force then concat('cashier_force_out_of_window: ', v_force_reason) else 'cashier_validation' end, v_now
  );
  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    v_lead.campaign_id, v_lead.id, 'prize_redeemed',
    jsonb_build_object('source', 'cashier', 'operatorUserId', p_operator_user_id, 'auditId', v_audit_id, 'forceRedemption', v_force), v_now);
  return query select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
    l.redemption_code, l.reward_available_at, l.reward_expires_at, l.redeemed_at, l.purchase_verified
    from public.leads l where l.id = v_lead.id;
end;
$$;
commit;
