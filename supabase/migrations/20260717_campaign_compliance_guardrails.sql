begin;

-- A publication record makes the last known campaign state explainable to the
-- merchant and to support. The application writes the current configuration
-- version into campaign_local_settings when a campaign is saved.
create table if not exists public.campaign_publication_audits (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  merchant_id text not null references public.merchants(id) on delete cascade,
  status text not null check (status in ('draft', 'active', 'paused', 'blocked')),
  configuration_version text not null,
  validation_issues jsonb not null default '[]'::jsonb,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists campaign_publication_audits_campaign_idx
  on public.campaign_publication_audits (campaign_id, created_at desc);

-- Freeze the public promise at draw-session creation. Existing prize/lead
-- snapshots remain in place; this adds the campaign-level version and rules.
alter table public.draw_sessions
  add column if not exists configuration_version text,
  add column if not exists configuration_snapshot jsonb;

create or replace function public.snapshot_draw_session_configuration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_prize public.prizes%rowtype;
begin
  select * into v_campaign
    from public.campaigns
   where id = new.campaign_id;

  if not found then
    return new;
  end if;

  if new.prize_id is not null then
    select * into v_prize from public.prizes where id = new.prize_id;
  end if;

  new.configuration_version := coalesce(
    nullif(v_campaign.campaign_local_settings -> 'compliance' ->> 'configurationVersion', ''),
    concat('legacy-', left(md5(v_campaign.id || v_campaign.created_at::text), 12))
  );
  new.configuration_snapshot := jsonb_build_object(
    'campaignId', v_campaign.id,
    'configurationVersion', new.configuration_version,
    'title', v_campaign.title,
    'subtitle', v_campaign.subtitle,
    'gameType', v_campaign.game_type,
    'availableAfterHours', v_campaign.available_after_hours,
    'availabilityDurationDays', v_campaign.availability_duration_days,
    'purchaseRequired', v_campaign.purchase_required,
    'isWinningEveryTime', v_campaign.is_winning_every_time,
    'prize', case when new.prize_id is null then null else jsonb_build_object(
      'id', v_prize.id,
      'label', v_prize.label,
      'probability', v_prize.probability,
      'usageConditions', coalesce(v_campaign.campaign_local_settings -> 'prizeSettings' -> v_prize.id ->> 'usageConditions', '')
    ) end
  );

  return new;
end;
$$;

drop trigger if exists draw_sessions_snapshot_configuration on public.draw_sessions;
create trigger draw_sessions_snapshot_configuration
  before insert on public.draw_sessions
  for each row execute function public.snapshot_draw_session_configuration();

-- Store the consent policy version and source alongside the existing explicit
-- boolean/timestamp. This keeps historical leads interpretable after copy or
-- privacy-policy changes.
alter table public.leads
  add column if not exists consent_policy_version text,
  add column if not exists consent_source text,
  add column if not exists campaign_configuration_version text;

create or replace function public.normalize_lead_consent_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_settings jsonb;
begin
  if not new.marketing_consent then
    new.consent_policy_version := null;
    new.consent_source := null;
    return new;
  end if;

  select campaign_local_settings into v_campaign_settings
    from public.campaigns
   where id = new.campaign_id;

  new.consent_policy_version := coalesce(
    nullif(new.consent_policy_version, ''),
    nullif(v_campaign_settings -> 'compliance' ->> 'rulesVersion', ''),
    '1'
  );
  new.consent_source := coalesce(nullif(new.consent_source, ''), 'campaign_form');
  new.campaign_configuration_version := coalesce(
    nullif(new.campaign_configuration_version, ''),
    nullif(v_campaign_settings -> 'compliance' ->> 'configurationVersion', '')
  );
  return new;
end;
$$;

drop trigger if exists leads_normalize_consent_evidence on public.leads;
create trigger leads_normalize_consent_evidence
  before insert or update of marketing_consent, consent_policy_version, consent_source
  on public.leads
  for each row execute function public.normalize_lead_consent_evidence();

create or replace function public.sync_lead_configuration_from_draw_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lead_id is not null and new.configuration_version is not null then
    update public.leads
       set campaign_configuration_version = coalesce(campaign_configuration_version, new.configuration_version)
     where id = new.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists draw_sessions_sync_lead_configuration on public.draw_sessions;
create trigger draw_sessions_sync_lead_configuration
  after update of lead_id on public.draw_sessions
  for each row execute function public.sync_lead_configuration_from_draw_session();

revoke all on table public.campaign_publication_audits from public, anon, authenticated;

commit;
