-- First roll the application back; export acknowledgement metadata if needed.
-- No delivery, provider event, gain or retry is deleted.
begin;
drop function if exists public.handle_support_email_incident(text,text,timestamptz,text);
drop index if exists public.reward_email_deliveries_support_active_idx;
alter table public.reward_email_deliveries
  drop column if exists support_is_handled,
  drop column if exists support_handled_status,
  drop column if exists support_handled_event_at,
  drop column if exists support_handled_by,
  drop column if exists support_handled_at;
notify pgrst, 'reload schema';
commit;
