begin;

alter table public.affiliate_accounts
  add column if not exists commission_rate_bps integer not null default 4000,
  add column if not exists commission_duration_months integer not null default 12;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'affiliate_accounts_commission_rate_check'
  ) then
    alter table public.affiliate_accounts
      add constraint affiliate_accounts_commission_rate_check
      check (commission_rate_bps >= 0 and commission_rate_bps <= 10000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'affiliate_accounts_commission_duration_check'
  ) then
    alter table public.affiliate_accounts
      add constraint affiliate_accounts_commission_duration_check
      check (commission_duration_months > 0 and commission_duration_months <= 120);
  end if;
end $$;

update public.affiliate_accounts
set
  status = 'disabled',
  commission_rate_bps = coalesce(commission_rate_bps, 4000),
  commission_duration_months = coalesce(commission_duration_months, 12),
  updated_at = now()
where status = 'active'
   or commission_rate_bps is null
   or commission_duration_months is null;

commit;
