create table if not exists public.business_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'error')),
  event text not null,
  merchant_id text references public.merchants(id) on delete set null,
  campaign_id text references public.campaigns(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  email text,
  redemption_code text,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_logs_created_at_idx
  on public.business_logs (created_at desc);

create index if not exists business_logs_merchant_created_at_idx
  on public.business_logs (merchant_id, created_at desc);

create index if not exists business_logs_campaign_created_at_idx
  on public.business_logs (campaign_id, created_at desc);

alter table public.business_logs enable row level security;

drop policy if exists "service role manages business logs" on public.business_logs;
create policy "service role manages business logs"
  on public.business_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
