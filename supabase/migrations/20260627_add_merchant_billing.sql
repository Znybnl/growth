alter table public.merchants
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists trial_start_date timestamptz,
  add column if not exists trial_end_date timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

create index if not exists merchants_stripe_customer_id_idx
  on public.merchants (stripe_customer_id);

create index if not exists merchants_stripe_subscription_id_idx
  on public.merchants (stripe_subscription_id);
