alter table public.campaign_events
  drop constraint if exists campaign_events_event_type_check;

alter table public.campaign_events
  add constraint campaign_events_event_type_check check (
    event_type in (
      'scan',
      'form_started',
      'lead_created',
      'review_clicked',
      'review_confirmed',
      'social_clicked',
      'game_played',
      'prize_won',
      'prize_redeemed',
      'prize_expired',
      'prize_reset'
    )
  );

create unique index if not exists leads_redemption_code_unique_idx
  on public.leads (redemption_code)
  where redemption_code is not null;
