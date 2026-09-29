-- #403: existing campaigns must use the merchant's current identity for reward emails.
-- App code already reads/writes public.merchants.restaurant_email as the business email;
-- add it conditionally for installations whose migration history is missing that column.
begin;

alter table public.merchants
  add column if not exists restaurant_email text;

-- Intentionally replace sender/reply-to for every existing campaign, including custom values,
-- as explicitly requested. Preserve all other email settings and only update the old sentence
-- where it appears in an existing campaign's body.
update public.campaigns as campaign
set campaign_local_settings = jsonb_set(
  coalesce(campaign.campaign_local_settings, '{}'::jsonb),
  '{email}',
  case
    when jsonb_typeof(campaign.campaign_local_settings -> 'email') = 'object'
      then campaign.campaign_local_settings -> 'email'
    else '{}'::jsonb
  end
    || jsonb_build_object(
      'senderName', '{{merchantName}}',
      'replyTo', coalesce(merchant.restaurant_email, '')
    )
    || case
      when coalesce(campaign.campaign_local_settings -> 'email' ->> 'body', '')
        like '%Rendez-vous sur place demain%'
      then jsonb_build_object(
        'body', replace(
          campaign.campaign_local_settings -> 'email' ->> 'body',
          'Rendez-vous sur place demain',
          'Rendez-vous sur place à partir de demain'
        )
      )
      else '{}'::jsonb
    end,
  true
)
from public.merchants as merchant
where merchant.id = campaign.merchant_id;

-- Rollback plan: reverting application code is safe and should leave the newly canonicalized
-- sender/reply-to values in place. The former custom values are intentionally not recoverable:
-- their replacement was explicitly requested in #403. Keep restaurant_email to avoid dropping
-- any business contact addresses entered after this migration.

commit;
