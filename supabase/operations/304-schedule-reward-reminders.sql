-- Operational activation AFTER migration, deployment, owner email validation and target check.
-- Enable pg_cron/pg_net in the Supabase dashboard. In Vault, create:
--   okado_reward_reminder_secret = the dedicated REWARD_REMINDER_CRON_SECRET (never put it in Git).
-- Do not run on a local/preview database. No email provider key is stored by this scheduler.
begin;
create or replace function public.invoke_reward_reminder_dispatch(p_now timestamptz default now())
returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare token text; request_id bigint;
begin
  -- Database clock, IANA zones, no hand-written summer/winter offset. No HTTP traffic while disabled/outside 09:00–09:04.
  if not exists(select 1 from public.reward_reminder_settings p join public.merchants m on m.workspace_id=p.workspace_id
    where p.enabled and m.location_status='active'
      and (p_now at time zone public.reward_reminder_zone(m.time_zone))::time >= time '09:00'
      and (p_now at time zone public.reward_reminder_zone(m.time_zone))::time < time '09:05') then return null; end if;
  select decrypted_secret into token from vault.decrypted_secrets where name='okado_reward_reminder_secret';
  if token is null or length(token)<32 then raise exception 'Reminder scheduler secret unavailable'; end if;
  select net.http_post(
    url:='https://app.okado.app/api/internal/reward-reminders',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
    body:='{}'::jsonb,timeout_milliseconds:=240000
  ) into request_id;
  return request_id;
end $$;
revoke all on function public.invoke_reward_reminder_dispatch(timestamptz) from public,anon,authenticated,service_role;
-- The job command contains no secret. Singleton worker lease prevents overlapping sends/rate-limit multiplication.
select cron.schedule('okado-reward-expiry-reminders-304','* * * * *','select public.invoke_reward_reminder_dispatch()');
commit;
-- Disable without losing audit data: select cron.unschedule('okado-reward-expiry-reminders-304');
