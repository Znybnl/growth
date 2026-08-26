-- Keep the persisted font enum aligned with the font catalogue exposed by the merchant forms.
-- The rollback is to restore the former constraint from
-- 20260714_campaign_heading_font_options.sql after first migrating incompatible rows.
alter table public.campaigns
  drop constraint if exists campaigns_heading_font_family_check;

alter table public.campaigns
  add constraint campaigns_heading_font_family_check
  check (
    heading_font_family in (
      'roboto',
      'geogrotesque',
      'comfortaa',
      'days-one',
      'delius-unicase',
      'lato',
      'lobster',
      'pacifico',
      'syncopate',
      'anton',
      'display',
      'sans',
      'serif',
      'cormorant',
      'fredoka',
      'inter',
      'bebas'
    )
  );
