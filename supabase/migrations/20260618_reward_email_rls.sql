revoke all on table public.reward_email_deliveries from anon, authenticated;
revoke all on table public.reward_email_events from anon, authenticated;

alter table public.reward_email_deliveries enable row level security;
alter table public.reward_email_events enable row level security;

drop policy if exists reward_email_deliveries_service_role_all
  on public.reward_email_deliveries;

create policy reward_email_deliveries_service_role_all
  on public.reward_email_deliveries
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists reward_email_events_service_role_all
  on public.reward_email_events;

create policy reward_email_events_service_role_all
  on public.reward_email_events
  for all
  to service_role
  using (true)
  with check (true);
