begin;

create table if not exists public.brevo_event_deliveries (
  dedupe_key text primary key,
  merchant_id text not null references public.merchants(id) on delete cascade,
  event_name text not null,
  event_properties jsonb not null default '{}'::jsonb,
  status text not null check (status in ('processing', 'sent', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error_status integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brevo_event_deliveries_merchant_created_idx
  on public.brevo_event_deliveries (merchant_id, created_at desc);

alter table public.brevo_event_deliveries enable row level security;

drop policy if exists "service role manages Brevo event deliveries"
  on public.brevo_event_deliveries;
create policy "service role manages Brevo event deliveries"
  on public.brevo_event_deliveries
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;

-- Rollback: drop table public.brevo_event_deliveries;
