begin;

-- The purchase requirement belongs to the prize being redeemed, not to the
-- campaign. Keep the legacy campaign column for compatibility, but migrate
-- existing values to each prize and stop using the campaign-level value.
alter table public.prizes
  add column if not exists purchase_required boolean not null default false;

update public.prizes as prizes
   set purchase_required = campaigns.purchase_required
  from public.campaigns as campaigns
 where campaigns.id = prizes.campaign_id
   and campaigns.purchase_required = true;

update public.campaigns
   set purchase_required = false
 where purchase_required = true;

-- Keep compliance snapshots aligned with the prize selected by the draw.
create or replace function public.snapshot_draw_session_configuration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_prize public.prizes%rowtype;
begin
  select * into v_campaign from public.campaigns where id = new.campaign_id;
  if not found then return new; end if;

  if new.prize_id is not null then
    select * into v_prize from public.prizes where id = new.prize_id;
  end if;

  new.configuration_version := coalesce(
    nullif(v_campaign.campaign_local_settings -> 'compliance' ->> 'configurationVersion', ''),
    concat('legacy-', left(md5(v_campaign.id || v_campaign.created_at::text), 12))
  );
  new.configuration_snapshot := jsonb_build_object(
    'campaignId', v_campaign.id,
    'configurationVersion', new.configuration_version,
    'title', v_campaign.title,
    'subtitle', v_campaign.subtitle,
    'gameType', v_campaign.game_type,
    'availableAfterHours', v_campaign.available_after_hours,
    'availabilityDurationDays', v_campaign.availability_duration_days,
    'purchaseRequired', coalesce(v_prize.purchase_required, false),
    'isWinningEveryTime', v_campaign.is_winning_every_time,
    'prize', case when new.prize_id is null then null else jsonb_build_object(
      'id', v_prize.id,
      'label', v_prize.label,
      'probability', v_prize.probability,
      'purchaseRequired', coalesce(v_prize.purchase_required, false),
      'usageConditions', coalesce(v_campaign.campaign_local_settings -> 'prizeSettings' -> v_prize.id ->> 'usageConditions', '')
    ) end
  );
  return new;
end;
$$;

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
  v_is_active boolean := coalesce((p_campaign ->> 'is_active')::boolean, true);
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

  if v_is_active and exists (
    select 1
      from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(probability numeric)
     where prize_row.probability < 0 or prize_row.probability > 100
  ) then
    raise exception 'La probabilitÃ© de chaque lot doit Ãªtre comprise entre 0 et 100.';
  end if;

  if v_is_active and not v_is_winning_every_time and v_total_probability > 100 then
    raise exception 'Le total des probabilitÃ©s ne peut pas dÃ©passer 100 %%.';
  end if;

  if v_is_active and v_is_winning_every_time and v_total_probability <= 0 then
    raise exception 'Ajoutez une probabilitÃ© supÃ©rieure Ã  0 pour au moins un lot.';
  end if;

  select merchant_id into v_existing_merchant_id
    from public.campaigns where id = v_campaign_id for update;

  if found and v_existing_merchant_id <> v_merchant_id then
    raise exception 'Campagne introuvable';
  end if;

  if exists (
    select 1
      from public.leads as leads
      join public.prizes as prizes on prizes.id = leads.prize_id
     where prizes.campaign_id = v_campaign_id
       and leads.prize_id is not null
       and not exists (
         select 1 from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(id text)
          where prize_row.id = prizes.id
       )
  ) then
    raise exception 'Un lot dÃ©jÃ  attribuÃ© ne peut pas Ãªtre supprimÃ©. DÃ©sactivez la campagne ou conservez ce lot jusquâ€™Ã  la fin des retraits.';
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
    nullif(p_campaign ->> 'target_url', ''), v_is_active,
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
    coalesce((p_campaign ->> 'reward_expiry_minutes')::integer, 20), false,
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
    reward_expiry_minutes = excluded.reward_expiry_minutes, purchase_required = false,
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
    id, campaign_id, label, total_quantity, remaining_quantity, probability,
    estimated_unit_cost, purchase_required
  )
  select id, v_campaign_id, label, total_quantity, remaining_quantity, probability,
    estimated_unit_cost, coalesce(purchase_required, false)
  from jsonb_to_recordset(coalesce(p_prizes, '[]'::jsonb)) as prize_row(
    id text, campaign_id text, label text, total_quantity integer, remaining_quantity integer,
    probability numeric, estimated_unit_cost numeric, purchase_required boolean
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
    estimated_unit_cost = excluded.estimated_unit_cost,
    purchase_required = excluded.purchase_required;

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

revoke all on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_campaign_setup(jsonb, jsonb, jsonb, jsonb) to service_role;

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

revoke all on function public.redeem_cashier_lead_prize(text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.redeem_cashier_lead_prize(text, text, text, boolean, text) to service_role;

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

revoke all on function public.redeem_cashier_lead_prize_force(text, text, text, boolean, text, boolean, text) from public, anon, authenticated;
grant execute on function public.redeem_cashier_lead_prize_force(text, text, text, boolean, text, boolean, text) to service_role;

commit;
