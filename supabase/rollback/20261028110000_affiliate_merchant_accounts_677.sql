begin;
drop function if exists public.record_affiliate_paid_invoice_677(text,text,timestamptz,integer,text,text);
drop trigger if exists affiliate_account_scope_677 on public.affiliate_accounts;
drop trigger if exists affiliate_referral_scope_677 on public.affiliate_referrals;
drop function if exists public.affiliate_fill_workspace_677();
alter table public.affiliate_referrals drop column affiliate_workspace_id, drop column referred_workspace_id;
alter table public.affiliate_accounts drop constraint affiliate_accounts_alias_scope_677;
alter table public.affiliate_accounts drop column canonical_account_id, drop column workspace_id;
commit;
-- Original account/code/referral/invoice rows and monetary amounts are untouched.
-- Deploy the previous application together with this rollback; site-level rows
-- will become visible again in the former administration.
