-- #491: administrative, read-only monitoring. No data rewrite.
begin;
set local lock_timeout = '5s';

create or replace function public.get_support_monitoring(
  p_section text, p_merchant text default null, p_query text default '',
  p_from timestamptz default null, p_until timestamptz default null,
  p_status text default 'all', p_incidents text default 'all',
  p_page integer default 1, p_size integer default 25
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare
  result jsonb; stats jsonb := '{}'::jsonb; source_sql text;
begin
  if p_section is null or p_section not in ('emails','webhooks','claims','logs','locations')
    or p_page is null or p_size is null or p_incidents is null
    or p_page < 1 or p_page > 1000000 or p_size < 1 or p_size > 50
    or length(coalesce(p_query,'')) > 200 or length(coalesce(p_merchant,'')) > 200
    or p_incidents not in ('all','active','handled')
    or (p_from is not null and p_until is not null and p_from >= p_until)
  then raise exception 'Invalid monitoring parameters'; end if;

  if p_section = 'locations' then
    return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',company_name) order by company_name,id),'[]'::jsonb)
      from public.merchants);
  elsif p_section = 'emails' then
    source_sql := $source$
      select d.id::text id, c.merchant_id merchant_id,
        coalesce(d.last_event_at,d.created_at) at, d.status status,
        d.support_is_handled handled,
        d.status in ('failed','bounced','complained','suppressed') attention,
        concat_ws(' ',c.title,m.company_name,l.first_name,d.recipient_email,d.error_message,d.id,d.lead_id) searchable,
        jsonb_strip_nulls(jsonb_build_object(
          'id',d.id,'kind','reward','at',coalesce(d.last_event_at,d.created_at),
          'status',d.status,'title',c.title,'merchant',m.company_name,
          'participant',l.first_name,'recipient',d.recipient_email,'detail',d.error_message,
          'eventAt',d.last_event_at,'handled',d.support_is_handled,
          'handledAt',case when d.support_is_handled then d.support_handled_at end,
          'canHandle',d.status in ('failed','bounced','complained','suppressed') and not d.support_is_handled
        )) row
      from public.reward_email_deliveries d
        left join public.campaigns c on c.id=d.campaign_id
        left join public.merchants m on m.id=c.merchant_id
        left join public.leads l on l.id=d.lead_id
      union all
      select j.id::text,j.merchant_id,coalesce(j.sent_at,j.created_at),
        case when j.status='pending' and j.attempts>0 then 'retry' else j.status end,
        false,j.status='needs_review' or (j.status='pending' and j.attempts>0),
        concat_ws(' ',j.merchant_name,j.frequency,j.status,j.id,j.recipient),
        jsonb_strip_nulls(jsonb_build_object(
          'id',j.id,'kind','notification','at',coalesce(j.sent_at,j.created_at),
          'status',case when j.status='pending' and j.attempts>0 then 'retry' else j.status end,
          'title',j.frequency,'merchant',j.merchant_name,'recipient',j.recipient,
          'attempts',j.attempts,'retryAt',j.retry_at,
          'periodStart',j.period_start,'periodEnd',j.period_end,'part',j.part,'parts',j.parts
        ))
      from public.merchant_gain_notification_jobs j
    $source$;
    select jsonb_build_object(
      'incidents',(select count(*) from public.reward_email_deliveries d left join public.campaigns c on c.id=d.campaign_id
        where (p_merchant is null or c.merchant_id=p_merchant) and not d.support_is_handled
          and d.status in ('failed','bounced','complained','suppressed')),
      'queued',(select count(*) from public.reward_email_deliveries d left join public.campaigns c on c.id=d.campaign_id
        where (p_merchant is null or c.merchant_id=p_merchant) and d.status in ('queued','sending')),
      'jobsWaiting',(select count(*) from public.merchant_gain_notification_jobs j
        where (p_merchant is null or j.merchant_id=p_merchant) and j.status in ('pending','sending')),
      'jobsRetry',(select count(*) from public.merchant_gain_notification_jobs j
        where (p_merchant is null or j.merchant_id=p_merchant) and j.status='pending' and j.attempts>0),
      'jobsReview',(select count(*) from public.merchant_gain_notification_jobs j
        where (p_merchant is null or j.merchant_id=p_merchant) and j.status='needs_review'),
      'eventsWaiting',(select count(*) from public.merchant_gain_notification_events e
        where (p_merchant is null or e.merchant_id=p_merchant) and e.job_id is null),
      'oldestEvent',(select min(e.won_at) from public.merchant_gain_notification_events e
        where (p_merchant is null or e.merchant_id=p_merchant) and e.job_id is null)
    ) into stats;
  elsif p_section = 'webhooks' then
    source_sql := $source$
      select e.id::text id,c.merchant_id merchant_id,e.created_at at,e.event_type status,
        false handled,false attention,
        concat_ws(' ',e.event_type,e.resend_email_id,c.title,m.company_name,d.recipient_email,d.status,e.id) searchable,
        jsonb_strip_nulls(jsonb_build_object(
          'id',e.id,'kind','webhook','at',e.created_at,'status',e.event_type,
          'title',c.title,'merchant',m.company_name,'recipient',d.recipient_email,
          'detail',d.status,'providerId',e.resend_email_id
        )) row
      from public.reward_email_events e
        left join public.reward_email_deliveries d on d.id=e.reward_email_delivery_id
        left join public.campaigns c on c.id=d.campaign_id
        left join public.merchants m on m.id=c.merchant_id
    $source$;
    select jsonb_build_object('latestWebhook',max(e.created_at)) into stats
      from public.reward_email_events e
      left join public.reward_email_deliveries d on d.id=e.reward_email_delivery_id
      left join public.campaigns c on c.id=d.campaign_id
      where p_merchant is null or c.merchant_id=p_merchant;
  elsif p_section = 'claims' then
    source_sql := $source$
      select l.id::text id,c.merchant_id merchant_id,l.created_at at,l.status status,
        false handled,false attention,
        concat_ws(' ',c.title,m.company_name,l.first_name,l.email,p.label,l.redemption_code,l.id) searchable,
        jsonb_strip_nulls(jsonb_build_object(
          'id',l.id,'kind','claim','at',l.created_at,'status',l.status,
          'title',c.title,'merchant',m.company_name,'participant',l.first_name,
          'recipient',l.email,'detail',p.label,'code',l.redemption_code,
          'availableAt',l.reward_available_at,'expiresAt',l.reward_expires_at
        )) row
      from public.leads l
        left join public.campaigns c on c.id=l.campaign_id
        left join public.merchants m on m.id=c.merchant_id
        left join public.prizes p on p.id=l.prize_id
      where l.prize_id is not null and l.status in ('claimed','expired','redeemed')
    $source$;
  else
    source_sql := $source$
      select b.id::text id,b.merchant_id merchant_id,b.created_at at,b.level status,
        false handled,false attention,
        concat_ws(' ',b.event,b.summary,b.merchant_id,b.campaign_id,b.lead_id,b.email,b.redemption_code,m.company_name) searchable,
        jsonb_strip_nulls(jsonb_build_object(
          'id',b.id,'kind','log','at',b.created_at,'status',b.level,'title',b.event,
          'merchant',m.company_name,'detail',b.summary,'campaignId',b.campaign_id,'leadId',b.lead_id
        )) row
      from public.business_logs b left join public.merchants m on m.id=b.merchant_id
    $source$;
    select jsonb_build_object('errorLogs',(
      select count(*) from public.business_logs
      where level='error' and (p_merchant is null or merchant_id=p_merchant)
        and (p_from is null or created_at>=p_from) and (p_until is null or created_at<p_until)
    ),'lastRun',(
      select jsonb_build_object('at',created_at,'status',level,'event',event,'detail',summary)
      from public.business_logs
      where event in ('gain_notification_scheduled_run','gain_notification_recovery_run')
      order by created_at desc,id desc limit 1
    )) into stats;
  end if;

  -- Values remain bound parameters. Only fixed, authored SELECT fragments are composed.
  execute format($query$
    with source as (%s), filtered as (
      select * from source
      where ($1 is null or merchant_id=$1)
        and ($2 is null or at >= $2) and ($3 is null or at < $3)
        and ($4='all' or status=$4 or row->>'title'=$4)
        and ($5='all' or (attention and handled=($5='handled')))
        and strpos(lower(searchable),lower($6))>0
    ), totals as (select count(*) n from filtered),
    paging as (select n,least($7,greatest(1,ceil(n::numeric/$8)::int)) page from totals),
    page_rows as (
      select row,at,id from filtered order by at desc,id desc
      limit $8 offset (select (page-1)*$8 from paging)
    )
    select jsonb_build_object('rows',coalesce((select jsonb_agg(row order by at desc,id desc) from page_rows),'[]'::jsonb),
      'total',n,'page',page,'stats',$9) from paging
  $query$,source_sql) into result
  using p_merchant,p_from,p_until,p_status,
    case when p_section='emails' then p_incidents else 'all' end,
    coalesce(p_query,''),p_page,p_size,stats;
  return result;
end;
$$;

revoke all on function public.get_support_monitoring(text,text,text,timestamptz,timestamptz,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.get_support_monitoring(text,text,text,timestamptz,timestamptz,text,text,integer,integer) to service_role;
commit;
