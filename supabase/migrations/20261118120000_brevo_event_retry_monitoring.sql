begin;
set local lock_timeout = '5s';

create or replace function public.get_brevo_event_monitoring(
  p_merchant text default null,
  p_query text default '',
  p_from timestamptz default null,
  p_until timestamptz default null,
  p_status text default 'all',
  p_page integer default 1,
  p_size integer default 25
) returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare result jsonb; stats jsonb;
begin
  if p_page is null or p_page < 1 or p_page > 1000000
    or p_size is null or p_size < 1 or p_size > 50
    or length(coalesce(p_query, '')) > 200 or length(coalesce(p_merchant, '')) > 200
    or length(coalesce(p_status, '')) > 100
    or (p_from is not null and p_until is not null and p_from >= p_until)
  then raise exception 'Invalid monitoring parameters'; end if;

  select jsonb_build_object(
    'processing', (select count(*) from public.brevo_event_deliveries where status = 'processing' and (p_merchant is null or merchant_id = p_merchant)),
    'retrying', (select count(*) from public.brevo_event_deliveries where status = 'retry' and (p_merchant is null or merchant_id = p_merchant)),
    'needsReview', (select count(*) from public.brevo_event_deliveries where status in ('needs_review','failed') and (p_merchant is null or merchant_id = p_merchant)),
    'oldestRetry', (select min(created_at) from public.brevo_event_deliveries where status = 'retry' and (p_merchant is null or merchant_id = p_merchant)),
    'lastRun', (select jsonb_build_object('at', created_at, 'status', level, 'event', event, 'detail', summary)
      from public.business_logs where event = 'brevo_event_retry_run'
      order by created_at desc, id desc limit 1)
  ) into stats;

  with source as (
    select d.dedupe_key id, d.merchant_id, d.created_at at, d.status,
      d.status in ('retry','failed','needs_review') attention,
      concat_ws(' ', d.dedupe_key, d.event_name, d.merchant_id, m.company_name,
        d.status, d.last_error_code, d.last_error_status::text) searchable,
      jsonb_strip_nulls(jsonb_build_object(
        'id', md5(d.dedupe_key), 'kind', 'brevo', 'at', d.created_at, 'status', d.status,
        'title', d.event_name, 'merchant', m.company_name, 'campaignId', null,
        'attempts', d.attempts, 'retryAt', d.next_attempt_at,
        'lastAttemptAt', d.last_attempt_at, 'errorCode', d.last_error_code,
        'errorStatus', d.last_error_status
      )) row
    from public.brevo_event_deliveries d
    left join public.merchants m on m.id = d.merchant_id
  ), filtered as (
    select * from source
    where (p_merchant is null or merchant_id = p_merchant)
      and (p_from is null or at >= p_from) and (p_until is null or at < p_until)
      and (p_status = 'all' or status = p_status)
      and strpos(lower(searchable), lower(coalesce(p_query, ''))) > 0
  ), totals as (select count(*) n from filtered),
  paging as (select n, least(p_page, greatest(1, ceil(n::numeric / p_size)::int)) page from totals),
  page_rows as (select row, at, id from filtered order by at desc, id desc limit p_size offset (select (page - 1) * p_size from paging))
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(row order by at desc, id desc) from page_rows), '[]'::jsonb),
    'total', n, 'page', page, 'stats', stats
  ) into result from paging;
  return result;
end;
$$;

revoke all on function public.get_brevo_event_monitoring(text,text,timestamptz,timestamptz,text,integer,integer) from public, anon, authenticated;
grant execute on function public.get_brevo_event_monitoring(text,text,timestamptz,timestamptz,text,integer,integer) to service_role;

commit;
