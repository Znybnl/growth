begin;
drop function if exists public.see_merchant_email_alerts(text,text,jsonb);
drop function public.get_merchant_operational_alerts(text);
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

alter table public.reward_email_deliveries drop column merchant_seen_at, drop column merchant_seen_event_at, drop column merchant_seen_status, drop column bounce_type;
notify pgrst, 'reload schema';
commit;
