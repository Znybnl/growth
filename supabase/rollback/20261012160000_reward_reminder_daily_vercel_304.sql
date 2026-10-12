-- Disable the daily Vercel cron / REWARD_REMINDERS_ENABLED=false before rollback.
-- Restores the previous eligibility without deleting data or enabling any job.
begin;
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
      and p.updated_at<=public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
      and p_now>=public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)
      and p_now<public.reward_reminder_due(l.reward_expires_at,p.days,m.time_zone)+interval '5 minutes')
$$;
create or replace function public.reward_reminder_schedule_version()
returns text language sql immutable set search_path = pg_catalog,public as $$
  select 'supabase-nine-v1'::text
$$;
revoke all on function public.reward_reminder_gain_eligible(text,timestamptz),
  public.reward_reminder_schedule_version() from public,anon,authenticated;
grant execute on function public.reward_reminder_gain_eligible(text,timestamptz),
  public.reward_reminder_schedule_version() to service_role;
commit;
