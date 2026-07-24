begin;

-- Recreate the cashier RPC with an explicit audit alias. The function returns a
-- column named `status`, so an unqualified audit status becomes ambiguous in
-- PL/pgSQL on databases where the function is already deployed.
create or replace function public.redeem_cashier_lead_prize(
  p_lead_id text,
  p_merchant_id text,
  p_operator_user_id text,
  p_purchase_confirmed boolean default false,
  p_idempotency_key text default null
)
returns table (
  id text,
  campaign_id text,
  first_name text,
  email text,
  prize_id text,
  status text,
  redemption_code text,
  reward_available_at timestamptz,
  reward_expires_at timestamptz,
  redeemed_at timestamptz,
  purchase_verified boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_campaign public.campaigns%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_existing_audit public.cashier_redemption_audits%rowtype;
  v_audit_id text := concat('cashier-', substr(md5(random()::text || clock_timestamp()::text), 1, 16));
begin
  if p_idempotency_key is not null then
    select * into v_existing_audit
      from public.cashier_redemption_audits as a
     where a.merchant_id = p_merchant_id
       and a.idempotency_key = p_idempotency_key
       and a.status = 'redeemed'
     limit 1;

    if found then
      return query
      select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
        l.redemption_code, l.reward_available_at, l.reward_expires_at,
        l.redeemed_at, l.purchase_verified
        from public.leads l where l.id = v_existing_audit.lead_id;
      return;
    end if;
  end if;

  select l.* into v_lead
    from public.leads l
    join public.campaigns c on c.id = l.campaign_id and c.merchant_id = p_merchant_id
   where l.id = p_lead_id
   for update;

  if not found then raise exception 'Gain introuvable'; end if;
  select c.* into v_campaign from public.campaigns c where c.id = v_lead.campaign_id;
  if v_lead.prize_id is null then raise exception 'Aucun lot à retirer'; end if;
  if v_lead.status = 'redeemed' then raise exception 'Lot déjà retiré'; end if;
  if v_lead.reward_available_at is not null and v_lead.reward_available_at > v_now then raise exception 'Lot pas encore disponible'; end if;
  if v_lead.reward_expires_at is not null and v_lead.reward_expires_at < v_now then
    update public.leads set status = 'expired' where id = v_lead.id;
    raise exception 'Lot expiré';
  end if;
  if v_lead.status <> 'claimed' then raise exception 'Lot indisponible'; end if;
  if v_campaign.purchase_required and not coalesce(p_purchase_confirmed, false) then raise exception 'Achat à confirmer avant le retrait'; end if;

  update public.leads
     set status = 'redeemed', redeemed_at = v_now,
         redeemed_by_user_id = nullif(p_operator_user_id, ''),
         purchase_verified = coalesce(p_purchase_confirmed, false)
   where id = v_lead.id;

  insert into public.cashier_redemption_audits (
    id, merchant_id, campaign_id, lead_id, redemption_code, operator_user_id,
    status, purchase_verified, idempotency_key, reason, created_at
  ) values (
    v_audit_id, p_merchant_id, v_lead.campaign_id, v_lead.id, v_lead.redemption_code,
    nullif(p_operator_user_id, ''), 'redeemed', coalesce(p_purchase_confirmed, false),
    nullif(p_idempotency_key, ''), 'cashier_validation', v_now
  );

  insert into public.campaign_events (id, campaign_id, lead_id, event_type, metadata, created_at)
  values (
    concat('evt-', substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
    v_lead.campaign_id, v_lead.id, 'prize_redeemed',
    jsonb_build_object('source', 'cashier', 'operatorUserId', p_operator_user_id, 'auditId', v_audit_id),
    v_now
  );

  return query
  select l.id, l.campaign_id, l.first_name, l.email, l.prize_id, l.status,
    l.redemption_code, l.reward_available_at, l.reward_expires_at,
    l.redeemed_at, l.purchase_verified
    from public.leads l where l.id = v_lead.id;
end;
$$;

revoke all on function public.redeem_cashier_lead_prize(text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.redeem_cashier_lead_prize(text, text, text, boolean, text) to service_role;

commit;

