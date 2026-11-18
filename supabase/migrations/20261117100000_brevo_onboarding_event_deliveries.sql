begin;

create table if not exists public.brevo_event_deliveries (
  dedupe_key text primary key,
  merchant_id text not null references public.merchants(id) on delete cascade,
  merchant_user_id text not null references public.merchant_users(id) on delete cascade,
  event_name text not null,
  event_properties jsonb not null default '{}'::jsonb,
  status text not null check (status in ('processing', 'sent', 'failed', 'retry', 'needs_review')),
  attempts integer not null default 1 check (attempts > 0),
  last_attempt_at timestamptz not null default now(),
  next_attempt_at timestamptz,
  last_error_code text check (last_error_code is null or length(last_error_code) <= 80),
  last_error_status integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brevo_event_deliveries_merchant_created_idx
  on public.brevo_event_deliveries (merchant_id, created_at desc);
create index if not exists brevo_event_deliveries_retry_idx
  on public.brevo_event_deliveries (next_attempt_at, created_at)
  where status = 'retry';

alter table public.brevo_event_deliveries enable row level security;

drop policy if exists "service role manages Brevo event deliveries"
  on public.brevo_event_deliveries;
create policy "service role manages Brevo event deliveries"
  on public.brevo_event_deliveries
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.claim_brevo_event_retry(p_now timestamptz default now())
returns setof public.brevo_event_deliveries
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  -- An interrupted send has an unknown provider outcome. Never resend it blindly.
  update public.brevo_event_deliveries
     set status = 'needs_review',
         next_attempt_at = null,
         last_error_code = coalesce(last_error_code, 'processing_interrupted'),
         updated_at = p_now
   where status = 'processing'
     and updated_at <= p_now - interval '30 minutes';

  -- Migrate old terminal failures conservatively: their provider outcome is unknown.
  update public.brevo_event_deliveries
     set status = 'needs_review',
         next_attempt_at = null,
         last_error_code = coalesce(last_error_code, 'previous_failure_needs_review'),
         updated_at = p_now
   where status = 'failed';

  update public.brevo_event_deliveries
     set status = 'needs_review',
         next_attempt_at = null,
         last_error_code = 'retry_limit_reached',
         updated_at = p_now
   where status = 'retry'
     and attempts >= 5;

  return query
  with due as (
    select d.dedupe_key
      from public.brevo_event_deliveries d
     where d.status = 'retry'
       and d.next_attempt_at <= p_now
       and d.attempts < 5
     order by d.next_attempt_at, d.created_at, d.dedupe_key
     for update skip locked
     limit 1
  )
  update public.brevo_event_deliveries d
     set status = 'processing',
         attempts = d.attempts + 1,
         last_attempt_at = p_now,
         next_attempt_at = null,
         updated_at = p_now
    from due
   where d.dedupe_key = due.dedupe_key
  returning d.*;
end;
$$;

revoke all on function public.claim_brevo_event_retry(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_brevo_event_retry(timestamptz) to service_role;

commit;

-- Rollback: drop function public.claim_brevo_event_retry(timestamptz); drop table public.brevo_event_deliveries;
