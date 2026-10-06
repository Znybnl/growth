-- Safe rollback: suspend and keep preference/outbox data for recovery.
-- First disable MERCHANT_GAIN_NOTIFICATIONS_ENABLED and remove the new cron.
begin;
drop trigger if exists queue_merchant_gain_notification on public.leads;
update public.merchant_gain_notification_preferences set frequency='disabled',updated_at=now();
update public.merchant_gain_notification_jobs set status='cancelled',
  gains='[]'::jsonb,email_payload=null,recipient=null,lease_until=null,lease_token=null
  where status in ('pending','sending');
-- Do not delete gains, campaigns, users, settings, outbox or participant e-mails.
commit;
