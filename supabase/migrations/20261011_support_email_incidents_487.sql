begin;

-- Display-only acknowledgement, independent of delivery and retry state.
alter table public.reward_email_deliveries
  add column if not exists support_handled_at timestamptz,
  add column if not exists support_handled_by text references public.merchant_users(id) on delete set null,
  add column if not exists support_handled_event_at timestamptz,
  add column if not exists support_handled_status text,
  add column if not exists support_is_handled boolean generated always as (
    support_handled_at is not null
    and support_handled_event_at is not distinct from last_event_at
    and support_handled_status is not distinct from status
  ) stored;

create index if not exists reward_email_deliveries_support_active_idx
  on public.reward_email_deliveries(campaign_id, last_event_at desc)
  where not support_is_handled and status in ('failed','bounced','complained','suppressed');

create or replace function public.handle_support_email_incident(
  p_delivery_id text, p_actor_user_id text,
  p_expected_event_at timestamptz, p_expected_status text
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  delivery public.reward_email_deliveries%rowtype;
  target_id public.reward_email_deliveries.id%type;
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.merchant_users where id = p_actor_user_id
  ) then
    raise exception 'Unknown actor' using errcode = '42501';
  end if;
  target_id := p_delivery_id;
  -- Serialize acknowledgement with concurrent provider events / retry updates.
  select * into delivery from public.reward_email_deliveries
    where id = target_id for update;
  if not found
    or delivery.status not in ('failed','bounced','complained','suppressed')
    or delivery.status is distinct from p_expected_status
    or delivery.last_event_at is distinct from p_expected_event_at then
    return false;
  end if;
  -- A duplicated click must not overwrite the first acknowledgement.
  if delivery.support_is_handled then return true; end if;
  update public.reward_email_deliveries
    set support_handled_at = now(), support_handled_by = p_actor_user_id,
        support_handled_event_at = delivery.last_event_at,
        support_handled_status = delivery.status
    where id = target_id;
  return true;
end;
$$;

revoke all on function public.handle_support_email_incident(text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.handle_support_email_incident(text,text,timestamptz,text) to service_role;
-- Keep the existing private table / RLS boundary, including the new columns.
revoke all on public.reward_email_deliveries from anon, authenticated;
alter table public.reward_email_deliveries enable row level security;

notify pgrst, 'reload schema';
commit;
