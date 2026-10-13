begin;
-- #498: private shared metrics; no historical rows rewritten, no emails replayed.
create index if not exists campaign_events_redemption_evidence_498_idx
 on public.campaign_events(campaign_id,lead_id,created_at desc)
 where event_type in ('prize_redeemed','prize_reset');
create or replace view public.campaign_effective_redemptions with (security_invoker=true) as
select l.id as lead_id, l.campaign_id, coalesce(l.redeemed_at, proven.created_at) as redeemed_at
from public.leads l
left join lateral (
  select max(e.created_at) as created_at from public.campaign_events e
  where e.campaign_id=l.campaign_id and e.lead_id=l.id and e.event_type='prize_redeemed'
    and e.created_at >= l.created_at and e.created_at <= now()
    and not exists(select 1 from public.campaign_events reset where reset.campaign_id=l.campaign_id
      and reset.lead_id=l.id and reset.event_type='prize_reset' and reset.created_at>=e.created_at)
) proven on true where l.status='redeemed';
revoke all on public.campaign_effective_redemptions from public,anon,authenticated;
grant select on public.campaign_effective_redemptions to service_role;

create or replace function public.get_campaign_metric_counts(p_campaign_ids text[])
returns table(campaign_id text, scans_count bigint, leads_count bigint, actions_count bigint,
 games_count bigint, wins_count bigint, redeemed_count bigint, estimated_spend numeric,
 opt_ins bigint, pending_count bigint, undated_redemptions bigint)
language sql security definer set search_path=public as $$
with target as (select id from public.campaigns where id=any(p_campaign_ids)),
ls as (select l.campaign_id,count(*) leads,
 count(*) filter(where l.prize_id is not null) wins,
 count(*) filter(where l.status='redeemed') redeemed,
 coalesce(sum(coalesce(p.estimated_unit_cost,0)) filter(where l.prize_id is not null),0) spend,
 count(*) filter(where l.marketing_consent) optins,
 count(*) filter(where l.prize_id is not null and l.status='claimed'
   and (l.reward_expires_at is null or l.reward_expires_at>=now())) pending
 from public.leads l join target t on t.id=l.campaign_id left join public.prizes p on p.id=l.prize_id group by l.campaign_id),
es as (select e.campaign_id,count(*) filter(where e.event_type='scan') scans,
 count(*) filter(where e.event_type in ('review_clicked','social_clicked')) actions
 from public.campaign_events e join target t on t.id=e.campaign_id group by e.campaign_id),
gs as (select cp.campaign_id,count(*) games from public.campaign_participations cp join target t on t.id=cp.campaign_id group by cp.campaign_id),
rs as (select r.campaign_id,count(*) filter(where r.redeemed_at is null) undated
 from public.campaign_effective_redemptions r join target t on t.id=r.campaign_id group by r.campaign_id)
select t.id,coalesce(es.scans,0),coalesce(ls.leads,0),coalesce(es.actions,0),coalesce(gs.games,0),
 coalesce(ls.wins,0),coalesce(ls.redeemed,0),coalesce(ls.spend,0),coalesce(ls.optins,0),
 coalesce(ls.pending,0),coalesce(rs.undated,0)
from target t left join ls on ls.campaign_id=t.id left join es on es.campaign_id=t.id
 left join gs on gs.campaign_id=t.id left join rs on rs.campaign_id=t.id;
$$;
revoke all on function public.get_campaign_metric_counts(text[]) from public,anon,authenticated;
grant execute on function public.get_campaign_metric_counts(text[]) to service_role;

create or replace function public.get_merchant_metric_details(p_merchant_id text)
returns table(campaign_id text,opt_ins bigint,pending_redemptions jsonb,undated_redemptions bigint)
language sql security definer set search_path=public as $$
select m.campaign_id,m.opt_ins,coalesce((select jsonb_agg(jsonb_build_object('prizeId',q.prize_id,'count',q.n))
 from (select l.prize_id,count(*) n from public.leads l where l.campaign_id=m.campaign_id
 and l.prize_id is not null and l.status='claimed' and (l.reward_expires_at is null or l.reward_expires_at>=now())
 group by l.prize_id) q),'[]'::jsonb),m.undated_redemptions
from public.get_campaign_metric_counts(array(select c.id from public.campaigns c where c.merchant_id=p_merchant_id)) m;
$$;
revoke all on function public.get_merchant_metric_details(text) from public,anon,authenticated;
grant execute on function public.get_merchant_metric_details(text) to service_role;

create or replace function public.get_platform_operational_metrics()
returns table(merchant_id text,contacts bigint,pending_rewards bigint,low_stock bigint,exhausted_stock bigint,failed_emails bigint)
language sql security definer set search_path=public as $$
with metrics as (select * from public.get_campaign_metric_counts(array(select id from public.campaigns))),
leads as (select c.merchant_id,sum(m.leads_count)::bigint contacts,sum(m.pending_count)::bigint pending
 from metrics m join public.campaigns c on c.id=m.campaign_id group by c.merchant_id),
stock as (select c.merchant_id,
 count(*) filter(where p.remaining_quantity>0 and p.total_quantity>0
  and p.remaining_quantity<=greatest(1,ceil(p.total_quantity*0.20))) low,
 count(*) filter(where p.remaining_quantity=0) exhausted
 from public.prizes p join public.campaigns c on c.id=p.campaign_id where c.is_active group by c.merchant_id),
emails as (select c.merchant_id,count(*) n from public.reward_email_deliveries d
 join public.campaigns c on c.id=d.campaign_id where not d.support_is_handled
 and d.status in ('failed','bounced','complained','suppressed') group by c.merchant_id)
select m.id,coalesce(l.contacts,0),coalesce(l.pending,0),coalesce(s.low,0),coalesce(s.exhausted,0),coalesce(e.n,0)
 from public.merchants m left join leads l on l.merchant_id=m.id left join stock s on s.merchant_id=m.id
 left join emails e on e.merchant_id=m.id;
$$;
revoke all on function public.get_platform_operational_metrics() from public,anon,authenticated;
grant execute on function public.get_platform_operational_metrics() to service_role;

-- Atomic same-state update covers all withdrawal paths, including the legacy RPC.
create or replace function public.sync_redemption_timestamp_498() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.status='redeemed' and old.status is distinct from 'redeemed' then
   if new.redeemed_at is not distinct from old.redeemed_at then
     new.redeemed_at:=now();
   else
     new.redeemed_at:=coalesce(new.redeemed_at,now());
   end if;
 elsif old.status='redeemed' and new.status is distinct from 'redeemed' then
   new.redeemed_at:=null;
 end if;
 return new;
end; $$;
drop trigger if exists leads_redemption_timestamp_498 on public.leads;
create trigger leads_redemption_timestamp_498 before update of status on public.leads
 for each row execute function public.sync_redemption_timestamp_498();
revoke all on function public.sync_redemption_timestamp_498() from public,anon,authenticated;
grant execute on function public.sync_redemption_timestamp_498() to service_role;

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
  metrics as (select * from public.get_campaign_metric_counts(array(select id from merchant_campaigns)))
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
    coalesce(ms.scans_count, 0) as scans_count,
    coalesce(ms.leads_count, 0) as leads_count,
    coalesce(ms.actions_count, 0) as actions_count,
    coalesce(ms.games_count, 0) as games_count,
    coalesce(ms.wins_count, 0) as wins_count,
    coalesce(ms.redeemed_count, 0) as redeemed_count,
    coalesce(ms.estimated_spend, 0) as estimated_spend
  from merchant_campaigns c
  left join metrics ms on ms.campaign_id = c.id
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
    metrics as (select * from public.get_campaign_metric_counts(array[p_campaign_id])),
    daily_participations as (
      select (l.created_at at time zone 'UTC')::date as day, count(*) as value
      from public.campaign_participations l
      where l.campaign_id = p_campaign_id
        and l.created_at >= ((now() at time zone 'UTC')::date - 6)::timestamp at time zone 'UTC'
      group by 1
    ),
    daily_redeemed as (
      select (r.redeemed_at at time zone 'UTC')::date as day,count(*) as value from public.campaign_effective_redemptions r
      where r.campaign_id=p_campaign_id
       and r.redeemed_at>=((now() at time zone 'UTC')::date-6)::timestamp at time zone 'UTC'
       and r.redeemed_at<((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC'
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
    action_volume_json as (
      select coalesce(jsonb_agg(jsonb_build_object('actionId',q.action_id,'actionIndex',coalesce(a.position,-1),'value',q.n)
       order by coalesce(a.position,-1),q.action_id),'[]'::jsonb) value
      from (select nullif(e.metadata->>'actionId','') action_id,count(*) n
       from public.campaign_events e where e.campaign_id=p_campaign_id
       and e.event_type in ('review_clicked','social_clicked') group by 1) q
      left join public.campaign_actions a on a.id=q.action_id and a.campaign_id=p_campaign_id
    )
  select
    coalesce(ms.scans_count, 0),
    coalesce(ms.leads_count, 0),
    coalesce(ms.actions_count, 0),
    coalesce(ms.games_count, 0),
    coalesce(ms.wins_count, 0),
    coalesce(ms.redeemed_count, 0),
    coalesce(ms.estimated_spend, 0),
    daily.value,
    action_volume_json.value
  from metrics ms
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
      from public.campaign_effective_redemptions l
      join public.campaigns c on c.id = l.campaign_id
      where c.merchant_id = p_merchant_id
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
create or replace function public.record_marketing_click(p_campaign_id text,p_event_id text,p_event_type text,p_action_id text,p_session_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_event public.campaign_events%rowtype; v_action public.campaign_actions%rowtype;
begin
 select a.* into v_action from public.campaign_actions a join public.campaigns c on c.id=a.campaign_id
 where a.id=p_action_id and a.campaign_id=p_campaign_id and c.is_active;
 if not found or p_event_type not in ('review_clicked','social_clicked')
  or (v_action.kind='google') is distinct from (p_event_type='review_clicked') then raise exception 'Action indisponible'; end if;
 insert into public.campaign_events(id,campaign_id,event_type,metadata)
 values('click-'||md5(p_campaign_id||':'||p_event_id),p_campaign_id,p_event_type,
 jsonb_build_object('actionId',v_action.id,'actionKind',v_action.kind,'sessionId',p_session_id,'eventId',p_event_id))
 on conflict(id) do nothing;
 select * into v_event from public.campaign_events where id='click-'||md5(p_campaign_id||':'||p_event_id);
 if v_event.campaign_id<>p_campaign_id or v_event.event_type<>p_event_type or v_event.metadata->>'actionId'<>p_action_id then
  raise exception 'Événement incompatible'; end if;
 return to_jsonb(v_event);
end; $$;
revoke all on function public.record_marketing_click(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_marketing_click(text,text,text,text,text) to service_role;

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
  v_now timestamptz := now();
  v_existing_audit public.cashier_redemption_audits%rowtype;
  v_audit_id text := concat('cashier-', substr(md5(random()::text || clock_timestamp()::text), 1, 16));
begin
  if p_idempotency_key is not null then
    select * into v_existing_audit from public.cashier_redemption_audits as a
     where a.merchant_id = p_merchant_id and a.idempotency_key = p_idempotency_key and a.status = 'redeemed' limit 1;
    if found then
      if v_existing_audit.lead_id<>p_lead_id or not exists(select 1 from public.leads current_gain
        where current_gain.id=p_lead_id and current_gain.status='redeemed') then
        raise exception 'Reprise incompatible ou retrait réinitialisé';
      end if;
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
  if v_lead.prize_id is null then raise exception 'Aucun lot à retirer'; end if;
  select p.* into v_prize from public.prizes p where p.id = v_lead.prize_id;
  if not found then raise exception 'Lot introuvable'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot déjà retiré'; end if;
  if v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then raise exception 'Lot pas encore disponible'; end if;
  if v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads as changed set status = 'expired' where changed.id = v_lead.id;
    raise exception 'Lot expiré';
  end if;
  if v_lead.status <> 'claimed' then raise exception 'Lot indisponible'; end if;
  if v_prize.purchase_required and not coalesce(p_purchase_confirmed, false) then raise exception 'Achat à confirmer avant le retrait'; end if;

  update public.leads as changed set status = 'redeemed', redeemed_at = v_now,
    redeemed_by_user_id = nullif(p_operator_user_id, ''), purchase_verified = coalesce(p_purchase_confirmed, false)
   where changed.id = v_lead.id;
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
  v_now timestamptz := now();
  v_existing_audit public.cashier_redemption_audits%rowtype;
  v_audit_id text := concat('cashier-', substr(md5(random()::text || clock_timestamp()::text), 1, 16));
  v_force boolean := coalesce(p_force_redemption, false);
  v_force_reason text := left(trim(coalesce(p_force_reason, '')), 500);
begin
  if v_force and length(v_force_reason) < 8 then raise exception 'Un motif d’au moins 8 caractères est requis pour forcer un retrait hors période'; end if;
  if p_idempotency_key is not null then
    select * into v_existing_audit from public.cashier_redemption_audits as a
     where a.merchant_id = p_merchant_id and a.idempotency_key = p_idempotency_key and a.status = 'redeemed' limit 1;
    if found then
      if v_existing_audit.lead_id<>p_lead_id or not exists(select 1 from public.leads current_gain
        where current_gain.id=p_lead_id and current_gain.status='redeemed') then
        raise exception 'Reprise incompatible ou retrait réinitialisé';
      end if;
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
  if v_lead.prize_id is null then raise exception 'Aucun lot à retirer'; end if;
  select p.* into v_prize from public.prizes p where p.id = v_lead.prize_id;
  if not found then raise exception 'Lot introuvable'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot déjà retiré'; end if;
  if v_force and v_lead.status <> 'expired'
     and (v_lead.reward_available_at is null or v_lead.reward_available_at <= v_now)
     and (v_lead.reward_expires_at is null or v_lead.reward_expires_at >= v_now) then
    raise exception 'Le forçage est réservé aux lots hors période de validité';
  end if;
  if not v_force and v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then raise exception 'Lot pas encore disponible'; end if;
  if not v_force and v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads as changed set status = 'expired' where changed.id = v_lead.id;
    raise exception 'Lot expiré';
  end if;
  if v_lead.status not in ('claimed', 'expired') then raise exception 'Lot indisponible'; end if;
  if v_prize.purchase_required and not coalesce(p_purchase_confirmed, false) then raise exception 'Achat à confirmer avant le retrait'; end if;
  update public.leads as changed set status = 'redeemed', redeemed_at = v_now,
    redeemed_by_user_id = nullif(p_operator_user_id, ''), purchase_verified = coalesce(p_purchase_confirmed, false)
   where changed.id = v_lead.id;
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
revoke all on function public.redeem_cashier_lead_prize(text,text,text,boolean,text),
 public.redeem_cashier_lead_prize_force(text,text,text,boolean,text,boolean,text) from public,anon,authenticated;
grant execute on function public.redeem_cashier_lead_prize(text,text,text,boolean,text),
 public.redeem_cashier_lead_prize_force(text,text,text,boolean,text,boolean,text) to service_role;
commit;
