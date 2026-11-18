-- Run manually in the Supabase SQL editor after pg_cron and pg_net are enabled
-- and the two values exist in Vault as OKADO_APP_URL and OKADO_CRON_SECRET.
-- Never replace Vault lookups with literal URLs or secrets in this file.
select cron.unschedule('brevo-email-decisions-every-five-minutes')
where exists (
  select 1 from cron.job where jobname = 'brevo-email-decisions-every-five-minutes'
);

select cron.schedule(
  'brevo-email-decisions-every-five-minutes',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'OKADO_APP_URL')
      || '/api/internal/brevo-email-decisions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'OKADO_CRON_SECRET'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- Rollback:
-- select cron.unschedule('brevo-email-decisions-every-five-minutes');
