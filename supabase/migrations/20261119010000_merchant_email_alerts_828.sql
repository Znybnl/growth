begin;

-- Consultation is separate from support's handling and from delivery state.
alter table public.reward_email_deliveries
  add column if not exists merchant_seen_at timestamptz,
  add column if not exists merchant_seen_event_at timestamptz,
  add column if not exists merchant_seen_status text,
  add column if not exists bounce_type text;

-- Restore the provider's structured type for current events already archived.
update public.reward_email_deliveries d set bounce_type=e.payload->'data'->'bounce'->>'type'
from public.reward_email_events e
where d.status='bounced' and e.reward_email_delivery_id=d.id
  and e.resend_email_id=d.resend_email_id and e.event_type='email.bounced'
  and case when e.payload->>'created_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
    then (e.payload->>'created_at')::timestamptz=d.last_event_at else false end
  and e.payload->'data'->'bounce'->>'type' in ('Permanent','Transient','Undetermined');

drop function public.get_merchant_operational_alerts(text);
create function public.get_merchant_operational_alerts(p_merchant_id text)
returns table(email_count bigint,email_campaign_id text,low_stock_count bigint,exhausted_stock_count bigint,stock_campaign_id text,email_snapshot jsonb)
language sql security definer set search_path=public as $$
with scoped as (
 select c.id,c.is_active from public.campaigns c where c.merchant_id=p_merchant_id
), attention as (
 select d.id,d.campaign_id,d.updated_at,d.last_event_at,d.status from public.reward_email_deliveries d
 join scoped c on c.id=d.campaign_id
 join public.leads l on l.id=d.lead_id and l.campaign_id=d.campaign_id
 where not d.support_is_handled and d.status in ('failed','bounced','complained','suppressed')
 and not (d.merchant_seen_at is not null and d.merchant_seen_event_at is not distinct from d.last_event_at and d.merchant_seen_status is not distinct from d.status)
 and l.prize_id is not null and l.status='claimed'
 and (l.reward_expires_at is null or l.reward_expires_at>=now())
), selected as (
 select a.campaign_id from attention a order by a.updated_at desc nulls last,a.id limit 1
), stock as (
 select p.id,p.campaign_id,p.remaining_quantity<=0 as exhausted,
 p.remaining_quantity>0 and p.total_quantity>0 and p.remaining_quantity<=greatest(1,ceil(p.total_quantity*0.20)) as low
 from public.prizes p join scoped c on c.id=p.campaign_id where c.is_active
)
select (select count(*) from attention), (select campaign_id from selected),
 (select count(*) from stock where low), (select count(*) from stock where exhausted),
 (select s.campaign_id from stock s where low or exhausted order by s.id limit 1),
 coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'status',a.status,'eventAt',a.last_event_at))
   from attention a where a.campaign_id=(select campaign_id from selected)), '[]'::jsonb);
$$;
revoke all on function public.get_merchant_operational_alerts(text) from public,anon,authenticated;
grant execute on function public.get_merchant_operational_alerts(text) to service_role;

create or replace function public.see_merchant_email_alerts(p_merchant_id text,p_campaign_id text,p_snapshot jsonb)
returns void language sql security definer set search_path=public as $$
 update public.reward_email_deliveries d
 set merchant_seen_at=now(),merchant_seen_event_at=d.last_event_at,merchant_seen_status=d.status
 from public.campaigns c, jsonb_to_recordset(p_snapshot) as item(id text,status text,"eventAt" timestamptz)
 where c.id=d.campaign_id and c.merchant_id=p_merchant_id and c.id=p_campaign_id
 and d.id::text=item.id and d.status=item.status and d.last_event_at is not distinct from item."eventAt"
 and d.status in ('failed','bounced','complained','suppressed');
$$;
revoke all on function public.see_merchant_email_alerts(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.see_merchant_email_alerts(text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
