-- #304: 09:00 is indicative. Use a daily Vercel pass, not a five-minute window.
-- Requires 20261012090000_reward_expiry_reminders_304.sql. No account is enabled.
begin;
set local lock_timeout = '5s';

create or replace function public.reward_reminder_gain_eligible(p_lead text,p_now timestamptz)
returns boolean language sql stable security definer set search_path = pg_catalog,public as $$
  select exists(select 1 from public.leads l join public.campaigns c on c.id=l.campaign_id
    join public.merchants m on m.id=c.merchant_id join public.reward_reminder_settings p on p.workspace_id=m.workspace_id
  where l.id=p_lead and p.enabled and m.location_status='active' and l.status='claimed' and l.redeemed_at is null
      and not coalesce((to_jsonb(l)->>'is_preview')::boolean,false)
      and l.prize_id is not null and exists(select 1 from public.prizes x where x.id=l.prize_id and x.campaign_id=c.id)
      and l.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(l.email)<=254
      and coalesce(l.redemption_code,'')<>'' and l.created_at is not null
      and l.reward_expires_at>=l.created_at+interval '480 hours' and l.reward_expires_at>p_now
      and (l.reward_available_at is null or l.reward_available_at<=p_now)
      and public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)>l.created_at
      and p.updated_at<=p_now
      and (p_now at time zone public.reward_reminder_zone(m.time_zone))::date =
        (public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
          at time zone public.reward_reminder_zone(m.time_zone))::date)
$$;

-- A read-only marker lets the worker fail closed on an old/missing SQL version.
create or replace function public.reward_reminder_schedule_version()
returns text language sql immutable set search_path = pg_catalog,public as $$
  select 'vercel-daily-v1'::text
$$;
revoke all on function public.reward_reminder_gain_eligible(text,timestamptz),
  public.reward_reminder_schedule_version() from public,anon,authenticated;
grant execute on function public.reward_reminder_gain_eligible(text,timestamptz),
  public.reward_reminder_schedule_version() to service_role;

-- Only stop the obsolete #304 scheduler, if it was installed. No other cron,
-- extension, Vault secret, preference, lead or email record is changed/deleted.
do $$ declare reminder_job bigint;
begin
  if to_regclass('cron.job') is not null then
    for reminder_job in execute
      'select jobid from cron.job where jobname = ''okado-reward-expiry-reminders-304'''
    loop
      execute 'select cron.unschedule($1)' using reminder_job;
    end loop;
  end if;
end $$;
commit;
