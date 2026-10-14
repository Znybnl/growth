begin;
-- #500: lean server-only page reads. Existing metrics, data and signatures are unchanged.
create or replace function public.get_merchant_page_overview(p_merchant_id text)
returns table(campaign_id text, campaign jsonb, metrics jsonb, pending_redemptions jsonb)
language sql security definer set search_path=public as $$
with scoped as (
 select c.id,
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
        null::text as logo_url,
        c.logo_size_percent,
        c.logo_margin_bottom_px,
        c.logo_align,
        c.background_mode,
        c.background_color,
        null::text as background_image_url,
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
        c.is_winning_every_time
 from public.campaigns c where c.merchant_id=p_merchant_id
),
metrics as materialized (
 select * from public.get_campaign_metric_counts(array(select id from scoped))
),
pending_by_prize as (
 select l.campaign_id,l.prize_id,count(*) as n
 from public.leads l join scoped c on c.id=l.campaign_id
 where l.prize_id is not null and l.status='claimed'
 and (l.reward_expires_at is null or l.reward_expires_at>=now())
 group by l.campaign_id,l.prize_id
),
pending as (
 select p.campaign_id,jsonb_agg(jsonb_build_object('prizeId',p.prize_id,'count',p.n) order by p.prize_id) as items
 from pending_by_prize p group by p.campaign_id
)
select c.id,to_jsonb(c),to_jsonb(m),coalesce(p.items,'[]'::jsonb)
from scoped c join metrics m on m.campaign_id=c.id
left join pending p on p.campaign_id=c.id;
$$;
revoke all on function public.get_merchant_page_overview(text) from public,anon,authenticated;
grant execute on function public.get_merchant_page_overview(text) to service_role;

create or replace function public.get_merchant_operational_alerts(p_merchant_id text)
returns table(email_count bigint,email_campaign_id text,low_stock_count bigint,exhausted_stock_count bigint,stock_campaign_id text)
language sql security definer set search_path=public as $$
with scoped as (
 select c.id,c.is_active from public.campaigns c where c.merchant_id=p_merchant_id
),
attention as (
 select d.id,d.campaign_id,d.updated_at from public.reward_email_deliveries d
 join scoped c on c.id=d.campaign_id
 join public.leads l on l.id=d.lead_id and l.campaign_id=d.campaign_id
 where not d.support_is_handled and d.status in ('failed','bounced','complained','suppressed')
 and l.prize_id is not null and l.status='claimed'
 and (l.reward_expires_at is null or l.reward_expires_at>=now())
),
stock as (
 select p.id,p.campaign_id,
 p.remaining_quantity<=0 as exhausted,
 p.remaining_quantity>0 and p.total_quantity>0
 and p.remaining_quantity<=greatest(1,ceil(p.total_quantity*0.20)) as low
 from public.prizes p join scoped c on c.id=p.campaign_id where c.is_active
)
select (select count(*) from attention),
 (select a.campaign_id from attention a order by a.updated_at desc nulls last,a.id limit 1),
 (select count(*) from stock where low),
 (select count(*) from stock where exhausted),
 (select s.campaign_id from stock s where low or exhausted order by s.id limit 1);
$$;
revoke all on function public.get_merchant_operational_alerts(text) from public,anon,authenticated;
grant execute on function public.get_merchant_operational_alerts(text) to service_role;
commit;
