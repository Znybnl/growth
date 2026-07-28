begin;

-- E-mail capture is now a dedicated campaign setting. CRM rows that were
-- previously stored in campaign_actions must not consume a visit slot or be
-- displayed as a marketing action. Preserve the old behaviour for campaigns
-- that did not yet have the dedicated setting.
update public.campaigns as campaigns
   set campaign_local_settings = coalesce(campaign_local_settings, '{}'::jsonb)
     || jsonb_build_object('emailCaptureEnabled', true)
 where not (coalesce(campaign_local_settings, '{}'::jsonb) ? 'emailCaptureEnabled')
   and exists (
     select 1
       from public.campaign_actions as actions
      where actions.campaign_id = campaigns.id
        and actions.kind = 'crm'
   );

delete from public.campaign_actions
 where kind = 'crm';

-- Keep the visual order contiguous after removing the legacy rows.
with ranked_actions as (
  select
    id,
    row_number() over (
      partition by campaign_id
      order by position asc, created_at asc, id asc
    ) - 1 as next_position
  from public.campaign_actions
)
update public.campaign_actions as actions
   set position = ranked_actions.next_position
  from ranked_actions
 where ranked_actions.id = actions.id
   and actions.position <> ranked_actions.next_position;

commit;
