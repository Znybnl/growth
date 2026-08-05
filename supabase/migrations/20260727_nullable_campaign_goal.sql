-- Classic campaign creation does not define a marketing objective.
-- The guided wizard remains the only flow that sets goal_type.
alter table public.campaigns
  alter column goal_type drop default,
  alter column goal_type drop not null;

comment on column public.campaigns.goal_type is
  'Marketing objective selected by the guided wizard; NULL for campaigns created with the classic editor.';
