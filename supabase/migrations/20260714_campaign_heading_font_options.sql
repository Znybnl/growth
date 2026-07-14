-- Adds the public game heading fonts while preserving campaigns created with the legacy "sans" option.
alter table public.campaigns
  drop constraint if exists campaigns_heading_font_family_check;

alter table public.campaigns
  add constraint campaigns_heading_font_family_check
  check (
    heading_font_family in (
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
