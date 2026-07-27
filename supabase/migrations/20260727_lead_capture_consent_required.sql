begin;

-- A lead-capture campaign is explicitly opt-in: the participation cannot be
-- persisted without the consent collected before the game starts.
create or replace function public.require_lead_capture_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.campaigns as campaigns
     where campaigns.id = new.campaign_id
       and (
         campaigns.goal_type = 'lead_capture'
         or exists (
           select 1
             from public.campaign_actions as actions
            where actions.campaign_id = campaigns.id
              and actions.kind = 'crm'
         )
       )
  ) and coalesce(new.marketing_consent, false) = false then
    raise exception 'Le consentement est obligatoire pour participer Ã  cette campagne.';
  end if;

  return new;
end;
$$;

drop trigger if exists leads_require_lead_capture_consent on public.leads;
create trigger leads_require_lead_capture_consent
  before insert or update of marketing_consent on public.leads
  for each row execute function public.require_lead_capture_consent();

commit;

