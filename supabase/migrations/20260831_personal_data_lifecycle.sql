begin;

-- Player data lifecycle: active for three years, restricted archive for two
-- additional years, then deletion. The archive is deliberately separate from
-- the application tables so normal merchant queries cannot expose it.
create table if not exists public.archived_leads (
  id text primary key,
  campaign_id text not null,
  merchant_id text not null,
  first_name text not null,
  email text not null,
  phone text,
  marketing_consent boolean not null,
  consent_timestamp timestamptz,
  prize_id text,
  status text not null,
  action_confirmed boolean not null,
  redemption_code text,
  reward_available_at timestamptz,
  reward_expires_at timestamptz,
  redeemed_at timestamptz,
  purchase_verified boolean not null default false,
  original_created_at timestamptz not null,
  archived_at timestamptz not null default timezone('utc', now()),
  purge_after timestamptz not null
);

create table if not exists public.archived_campaign_events (
  id text primary key,
  campaign_id text not null,
  lead_id text,
  event_type text not null,
  original_created_at timestamptz not null,
  archived_at timestamptz not null default timezone('utc', now()),
  purge_after timestamptz not null
);

create table if not exists public.archived_cashier_redemption_audits (
  id text primary key,
  merchant_id text not null,
  campaign_id text not null,
  lead_id text not null,
  redemption_code text not null,
  operator_user_id text,
  status text not null,
  purchase_verified boolean not null default false,
  idempotency_key text,
  reason text,
  original_created_at timestamptz not null,
  archived_at timestamptz not null default timezone('utc', now()),
  purge_after timestamptz not null
);

create index if not exists archived_leads_purge_after_idx
  on public.archived_leads (purge_after);
create index if not exists archived_campaign_events_purge_after_idx
  on public.archived_campaign_events (purge_after);
create index if not exists archived_cashier_audits_purge_after_idx
  on public.archived_cashier_redemption_audits (purge_after);

alter table public.archived_leads enable row level security;
alter table public.archived_campaign_events enable row level security;
alter table public.archived_cashier_redemption_audits enable row level security;

drop policy if exists archived_leads_service_role_all on public.archived_leads;
create policy archived_leads_service_role_all on public.archived_leads
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists archived_campaign_events_service_role_all on public.archived_campaign_events;
create policy archived_campaign_events_service_role_all on public.archived_campaign_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists archived_cashier_audits_service_role_all on public.archived_cashier_redemption_audits;
create policy archived_cashier_audits_service_role_all on public.archived_cashier_redemption_audits
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on table public.archived_leads, public.archived_campaign_events,
  public.archived_cashier_redemption_audits from anon, authenticated;

create or replace function public.purge_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_active_cutoff timestamptz := v_now - interval '3 years';
  v_archive_cutoff timestamptz := v_now - interval '5 years';
  v_archived_leads integer := 0;
  v_archived_events integer := 0;
  v_archived_audits integer := 0;
  v_deleted_leads integer := 0;
  v_deleted_events integer := 0;
  v_deleted_audits integer := 0;
begin
  create temp table lifecycle_lead_ids (id text primary key) on commit drop;

  insert into lifecycle_lead_ids (id)
  select id from public.leads where created_at < v_active_cutoff;

  insert into public.archived_leads (
    id, campaign_id, merchant_id, first_name, email, phone,
    marketing_consent, consent_timestamp, prize_id, status,
    action_confirmed, redemption_code, reward_available_at,
    reward_expires_at, redeemed_at, purchase_verified,
    original_created_at, archived_at, purge_after
  )
  select l.id, l.campaign_id, c.merchant_id, l.first_name, l.email, l.phone,
    l.marketing_consent, l.consent_timestamp, l.prize_id, l.status,
    l.action_confirmed, l.redemption_code, l.reward_available_at,
    l.reward_expires_at, l.redeemed_at, l.purchase_verified,
    l.created_at, v_now, l.created_at + interval '5 years'
  from public.leads l
  join public.campaigns c on c.id = l.campaign_id
  join lifecycle_lead_ids ids on ids.id = l.id
  on conflict (id) do nothing;
  get diagnostics v_archived_leads = row_count;

  insert into public.archived_campaign_events (
    id, campaign_id, lead_id, event_type, original_created_at, archived_at, purge_after
  )
  select e.id, e.campaign_id, e.lead_id, e.event_type, e.created_at, v_now,
    e.created_at + interval '5 years'
  from public.campaign_events e
  where e.created_at < v_active_cutoff
  on conflict (id) do nothing;
  get diagnostics v_archived_events = row_count;

  insert into public.archived_cashier_redemption_audits (
    id, merchant_id, campaign_id, lead_id, redemption_code, operator_user_id,
    status, purchase_verified, idempotency_key, reason,
    original_created_at, archived_at, purge_after
  )
  select a.id, a.merchant_id, a.campaign_id, a.lead_id, a.redemption_code,
    a.operator_user_id, a.status, a.purchase_verified, a.idempotency_key,
    a.reason, a.created_at, v_now, a.created_at + interval '5 years'
  from public.cashier_redemption_audits a
  join lifecycle_lead_ids ids on ids.id = a.lead_id
  on conflict (id) do nothing;
  get diagnostics v_archived_audits = row_count;

  -- Remove dependent operational records first. Their business meaning is
  -- preserved in the restricted archive where applicable.
  delete from public.reward_email_deliveries d
   using lifecycle_lead_ids ids where d.lead_id = ids.id;
  delete from public.campaign_events e where e.created_at < v_active_cutoff;
  get diagnostics v_deleted_events = row_count;
  delete from public.cashier_redemption_audits a
   using lifecycle_lead_ids ids where a.lead_id = ids.id;
  get diagnostics v_deleted_audits = row_count;
  delete from public.leads l using lifecycle_lead_ids ids where l.id = ids.id;
  get diagnostics v_deleted_leads = row_count;

  delete from public.archived_campaign_events where purge_after <= v_now;
  delete from public.archived_cashier_redemption_audits where purge_after <= v_now;
  delete from public.archived_leads where purge_after <= v_now;

  return jsonb_build_object(
    'activeCutoff', v_active_cutoff,
    'archiveCutoff', v_archive_cutoff,
    'archivedLeads', v_archived_leads,
    'archivedEvents', v_archived_events,
    'archivedAudits', v_archived_audits,
    'deletedLeads', v_deleted_leads,
    'deletedEvents', v_deleted_events,
    'deletedAudits', v_deleted_audits
  );
end;
$$;

revoke all on function public.purge_personal_data() from public, anon, authenticated;
grant execute on function public.purge_personal_data() to service_role;

comment on table public.archived_leads is 'Archive restreinte des participations contenant des données personnelles, supprimée à 5 ans.';
comment on table public.archived_campaign_events is 'Archive restreinte des événements de jeu, sans metadata potentiellement personnelle.';
comment on table public.archived_cashier_redemption_audits is 'Archive restreinte des preuves de retrait, supprimée à 5 ans.';

commit;
