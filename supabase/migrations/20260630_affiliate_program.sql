begin;

create table if not exists public.affiliate_accounts (
  id text primary key default ('aff_' || replace(gen_random_uuid()::text, '-', '')),
  merchant_id text not null references public.merchants(id) on delete cascade,
  code text not null,
  status text not null default 'disabled' check (status in ('active', 'disabled')),
  commission_rate_bps integer not null default 4000,
  commission_duration_months integer not null default 12,
  payout_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id),
  unique (code),
  constraint affiliate_accounts_commission_rate_check check (
    commission_rate_bps >= 0 and commission_rate_bps <= 10000
  ),
  constraint affiliate_accounts_commission_duration_check check (
    commission_duration_months > 0 and commission_duration_months <= 120
  )
);

create table if not exists public.affiliate_referrals (
  id text primary key default ('ref_' || replace(gen_random_uuid()::text, '-', '')),
  affiliate_account_id text not null references public.affiliate_accounts(id) on delete cascade,
  affiliate_merchant_id text not null references public.merchants(id) on delete cascade,
  referred_merchant_id text not null references public.merchants(id) on delete cascade,
  referral_code text not null,
  source text not null default 'signup',
  status text not null default 'registered' check (status in ('registered', 'trialing', 'active', 'canceled')),
  first_subscription_paid_at timestamptz,
  commission_eligible_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_merchant_id),
  constraint affiliate_referrals_no_self_referral check (affiliate_merchant_id <> referred_merchant_id)
);

create table if not exists public.affiliate_payouts (
  id text primary key default ('pay_' || replace(gen_random_uuid()::text, '-', '')),
  affiliate_merchant_id text not null references public.merchants(id) on delete cascade,
  amount_cents integer not null default 0,
  currency text not null default 'eur',
  status text not null default 'paid' check (status in ('paid', 'canceled')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_commissions (
  id text primary key default ('com_' || replace(gen_random_uuid()::text, '-', '')),
  referral_id text not null references public.affiliate_referrals(id) on delete cascade,
  affiliate_merchant_id text not null references public.merchants(id) on delete cascade,
  referred_merchant_id text not null references public.merchants(id) on delete cascade,
  stripe_invoice_id text not null,
  stripe_subscription_id text,
  invoice_paid_at timestamptz not null,
  invoice_amount_cents integer not null,
  commission_rate_bps integer not null default 5000,
  commission_duration_months integer not null default 12,
  commission_amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'void')),
  payout_id text references public.affiliate_payouts(id) on delete set null,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stripe_invoice_id)
);

create index if not exists affiliate_accounts_merchant_id_idx
  on public.affiliate_accounts (merchant_id);

create index if not exists affiliate_referrals_affiliate_merchant_idx
  on public.affiliate_referrals (affiliate_merchant_id, created_at desc);

create index if not exists affiliate_referrals_referred_merchant_idx
  on public.affiliate_referrals (referred_merchant_id);

create index if not exists affiliate_commissions_affiliate_status_idx
  on public.affiliate_commissions (affiliate_merchant_id, status, invoice_paid_at desc);

create index if not exists affiliate_commissions_referred_idx
  on public.affiliate_commissions (referred_merchant_id, invoice_paid_at desc);

alter table public.affiliate_accounts enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payouts enable row level security;

drop policy if exists "service role manages affiliate accounts" on public.affiliate_accounts;
create policy "service role manages affiliate accounts"
  on public.affiliate_accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages affiliate referrals" on public.affiliate_referrals;
create policy "service role manages affiliate referrals"
  on public.affiliate_referrals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages affiliate commissions" on public.affiliate_commissions;
create policy "service role manages affiliate commissions"
  on public.affiliate_commissions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages affiliate payouts" on public.affiliate_payouts;
create policy "service role manages affiliate payouts"
  on public.affiliate_payouts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.affiliate_accounts (merchant_id, code, status)
select
  merchants.id,
  'OKADO-' || upper(substr(md5(merchants.id), 1, 6)),
  'disabled'
from public.merchants as merchants
on conflict (merchant_id) do nothing;

comment on table public.affiliate_accounts is 'Comptes affiliés rattachés aux marchands Okado.';
comment on table public.affiliate_referrals is 'Attributions filleul vers affilié.';
comment on table public.affiliate_commissions is 'Commissions générées depuis les factures Stripe payées.';
comment on table public.affiliate_payouts is 'Paiements manuels de commissions affiliées.';

commit;
