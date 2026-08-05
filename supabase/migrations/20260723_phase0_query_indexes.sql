-- Indexes supporting the merchant email-alert view and public redemption lookup.
-- Safe to run repeatedly on the production project.

create index if not exists reward_email_deliveries_campaign_status_idx
  on public.reward_email_deliveries (campaign_id, status, lead_id);

create index if not exists leads_campaign_status_prize_idx
  on public.leads (campaign_id, status, prize_id);
