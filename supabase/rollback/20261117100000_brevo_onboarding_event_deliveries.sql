-- Apply the application rollback first. This removes delivery history for the Brevo event outbox.
drop function if exists public.claim_brevo_event_retry(timestamptz);
drop table if exists public.brevo_event_deliveries;
