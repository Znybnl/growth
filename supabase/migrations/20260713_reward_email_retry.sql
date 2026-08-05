begin;

alter table public.reward_email_deliveries
  add column if not exists retry_count integer not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_retry_at timestamptz;

create index if not exists reward_email_deliveries_retry_idx
  on public.reward_email_deliveries (status, next_retry_at)
  where status = 'failed';

create or replace function public.schedule_reward_email_retry(
  p_delivery_id text,
  p_error_message text
)
returns table (retry_count integer, next_retry_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retry_count integer;
  v_next_retry_at timestamptz;
  v_now timestamptz := timezone('utc', now());
begin
  update public.reward_email_deliveries
     set retry_count = retry_count + 1,
         last_retry_at = v_now,
         next_retry_at = case
           when retry_count + 1 < 3
             then v_now + make_interval(mins => 15 * (2 ^ retry_count)::integer)
           else null
         end,
         status = 'failed',
         error_message = left(coalesce(p_error_message, 'Envoi impossible'), 1000),
         last_event_at = v_now
   where id = p_delivery_id
   returning retry_count, next_retry_at into v_retry_count, v_next_retry_at;

  if not found then raise exception 'Suivi e-mail introuvable'; end if;
  return query select v_retry_count, v_next_retry_at;
end;
$$;

revoke all on function public.schedule_reward_email_retry(text, text) from public, anon, authenticated;
grant execute on function public.schedule_reward_email_retry(text, text) to service_role;

commit;
