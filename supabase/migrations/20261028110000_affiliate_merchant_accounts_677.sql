begin;

-- Keep every historic account/code/invoice; secondary codes become aliases.
alter table public.affiliate_accounts
  add column workspace_id text references public.merchant_workspaces(id),
  add column canonical_account_id text references public.affiliate_accounts(id);
update public.affiliate_accounts a set workspace_id=m.workspace_id
from public.merchants m where m.id=a.merchant_id;
alter table public.affiliate_accounts alter column workspace_id set not null;

do $$ begin
  if exists (select workspace_id from public.affiliate_accounts where status='active'
    group by workspace_id having count(distinct (commission_rate_bps,commission_duration_months))>1) then
    raise exception 'Affiliation #677 : paramètres actifs contradictoires pour un même compte. Réconciliation administrative requise avant migration.';
  end if;
end $$;
with ranked as (
  select id, first_value(id) over(partition by workspace_id order by
    (status='active') desc, created_at, id) as canonical
  from public.affiliate_accounts
)
update public.affiliate_accounts a set canonical_account_id=r.canonical
from ranked r where r.id=a.id and r.id<>r.canonical;
create unique index affiliate_accounts_one_per_workspace_677
  on public.affiliate_accounts(workspace_id) where canonical_account_id is null;
create unique index affiliate_accounts_id_workspace_677 on public.affiliate_accounts(id,workspace_id);
alter table public.affiliate_accounts add constraint affiliate_accounts_alias_scope_677
  foreign key(canonical_account_id,workspace_id) references public.affiliate_accounts(id,workspace_id);
alter table public.affiliate_accounts add constraint affiliate_accounts_alias_not_self_677
  check(canonical_account_id is null or canonical_account_id<>id);

alter table public.affiliate_referrals
  add column affiliate_workspace_id text references public.merchant_workspaces(id),
  add column referred_workspace_id text references public.merchant_workspaces(id);
update public.affiliate_referrals r set affiliate_workspace_id=a.workspace_id,
  referred_workspace_id=m.workspace_id
from public.affiliate_accounts a, public.merchants m
where a.id=r.affiliate_account_id and m.id=r.referred_merchant_id;
alter table public.affiliate_referrals
  alter column affiliate_workspace_id set not null,
  alter column referred_workspace_id set not null;
-- Ambiguous historical attributions abort the transaction instead of dropping data.
alter table public.affiliate_referrals add constraint affiliate_referrals_account_unique_677 unique(referred_workspace_id);
alter table public.affiliate_referrals add constraint affiliate_referrals_no_self_account_677
  check(affiliate_workspace_id<>referred_workspace_id);
alter table public.affiliate_referrals add constraint affiliate_referrals_account_scope_677
  foreign key(affiliate_account_id,affiliate_workspace_id) references public.affiliate_accounts(id,workspace_id);

-- Expand/contract: the deployed application can still write its legacy fields
-- during the interval between SQL migration and application deployment.
create function public.affiliate_fill_workspace_677() returns trigger
language plpgsql set search_path='' as $$
declare v_workspace text; v_affiliate_workspace text;
begin
  if tg_table_name='affiliate_accounts' then
    select workspace_id into v_workspace from public.merchants where id=new.merchant_id;
    if new.workspace_id is not null and new.workspace_id<>v_workspace then raise exception 'Périmètre du compte affilié invalide.'; end if;
    new.workspace_id:=v_workspace;
  else
    select workspace_id into v_workspace from public.merchants where id=new.referred_merchant_id;
    select workspace_id into v_affiliate_workspace from public.affiliate_accounts where id=new.affiliate_account_id;
    if (new.referred_workspace_id is not null and new.referred_workspace_id<>v_workspace)
      or (new.affiliate_workspace_id is not null and new.affiliate_workspace_id<>v_affiliate_workspace) then
      raise exception 'Périmètre du parrainage invalide.';
    end if;
    new.referred_workspace_id:=v_workspace; new.affiliate_workspace_id:=v_affiliate_workspace;
  end if;
  return new;
end $$;
revoke all on function public.affiliate_fill_workspace_677() from public,anon,authenticated;
create trigger affiliate_account_scope_677 before insert or update on public.affiliate_accounts
  for each row execute function public.affiliate_fill_workspace_677();
create trigger affiliate_referral_scope_677 before insert or update on public.affiliate_referrals
  for each row execute function public.affiliate_fill_workspace_677();

-- Serializes invoices for one referred account, including first-payment initialization.
-- A cancellation is an account state, not the end of the original eligibility window.
create function public.record_affiliate_paid_invoice_677(
  p_merchant_id text, p_invoice_id text, p_paid_at timestamptz,
  p_amount_cents integer, p_currency text, p_subscription_id text default null
) returns text language plpgsql security definer set search_path='' as $$
declare
  v_ref public.affiliate_referrals%rowtype;
  v_account public.affiliate_accounts%rowtype;
  v_workspace text;
  v_first timestamptz;
  v_until timestamptz;
  v_id text;
  v_historic_first timestamptz;
  v_historic_duration integer;
begin
  if p_invoice_id is null or btrim(p_invoice_id)='' or p_paid_at is null or p_amount_cents is null or p_amount_cents<=0 then return null; end if;
  select workspace_id into v_workspace from public.merchants where id=p_merchant_id;
  select * into v_ref from public.affiliate_referrals where referred_workspace_id=v_workspace for update;
  if not found then return null; end if;
  select * into v_account from public.affiliate_accounts
    where workspace_id=v_ref.affiliate_workspace_id and canonical_account_id is null and status='active' for share;
  if not found then return null; end if;
  select invoice_paid_at,commission_duration_months into v_historic_first,v_historic_duration
    from public.affiliate_commissions where referral_id=v_ref.id order by invoice_paid_at,id limit 1;
  v_first:=coalesce(v_ref.first_subscription_paid_at,v_historic_first,p_paid_at);
  v_until:=coalesce(v_ref.commission_eligible_until,
    ((v_first at time zone 'UTC')+make_interval(months=>coalesce(v_historic_duration,v_account.commission_duration_months))) at time zone 'UTC');
  if p_paid_at>=v_until then return null; end if;
  insert into public.affiliate_commissions(referral_id,affiliate_merchant_id,referred_merchant_id,
    stripe_invoice_id,stripe_subscription_id,invoice_paid_at,invoice_amount_cents,
    commission_rate_bps,commission_duration_months,commission_amount_cents,currency,status)
  values(v_ref.id,v_account.merchant_id,v_ref.referred_merchant_id,p_invoice_id,p_subscription_id,p_paid_at,p_amount_cents,
    v_account.commission_rate_bps,v_account.commission_duration_months,
    round(p_amount_cents::numeric*v_account.commission_rate_bps/10000)::integer,coalesce(p_currency,'eur'),'pending')
  on conflict(stripe_invoice_id) do nothing returning id into v_id;
  if v_id is null then return null; end if;
  update public.affiliate_referrals set status='active', first_subscription_paid_at=v_first,
    commission_eligible_until=v_until, updated_at=now() where id=v_ref.id;
  return v_id;
end $$;
revoke all on function public.record_affiliate_paid_invoice_677(text,text,timestamptz,integer,text,text) from public,anon,authenticated;
grant execute on function public.record_affiliate_paid_invoice_677(text,text,timestamptz,integer,text,text) to service_role;

comment on column public.affiliate_accounts.workspace_id is 'Programme commun au compte marchand, indépendant de l’établissement sélectionné (#677).';
comment on column public.affiliate_accounts.canonical_account_id is 'Ancien code conservé comme alias du programme du compte ; aucune suppression de données financières.';
commit;
