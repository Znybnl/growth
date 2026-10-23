-- Only after application rollback and owner authorization. Preserve audit and snapshots.
begin;
drop view if exists public.campaign_participation_marketing;
drop trigger if exists campaign_events_marketing_snapshot_638 on public.campaign_events;
drop function if exists public.snapshot_participation_marketing_638();
drop trigger if exists campaigns_google_click_acceptance_638 on public.campaigns;
drop function if exists public.validate_google_click_acceptance_638();
drop function if exists public.create_draw_session_with_marketing(text,text,text,text);
commit;
