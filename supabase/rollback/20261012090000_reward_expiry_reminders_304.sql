-- Roll back application and disable the named scheduler first. Preserve settings/jobs for audit.
begin;
update public.reward_reminder_settings set enabled=false,version=gen_random_uuid(),updated_at=now();
update public.reward_reminder_jobs set status=case when attempts=0 then 'cancelled' else 'needs_review' end,
  email_payload=null,lease_token=null,lease_until=null where status in ('pending','sending');
commit;
