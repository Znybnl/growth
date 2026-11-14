-- Preserve the colour actually displayed by the old Tropical wheel renderer.
-- Run before deploying the title-colour fix, while that renderer is still active.
begin;
create table if not exists public.tropical_title_color_786_backup (
  campaign_id text primary key,
  old_heading_color text not null,
  displayed_color text not null,
  applied boolean not null default false
);
alter table public.tropical_title_color_786_backup enable row level security;
revoke all on public.tropical_title_color_786_backup from public, anon, authenticated;

insert into public.tropical_title_color_786_backup (campaign_id, old_heading_color, displayed_color)
select id, heading_text_color, campaign_local_settings ->> 'logoTextColor'
from public.campaigns
where game_type = 'wheel'
  and campaign_local_settings ->> 'gamePageTemplateId' = 'travel-tropical'
  and campaign_local_settings ->> 'logoTextColor' ~* '^#[0-9a-f]{6}$'
  and lower(heading_text_color) <> lower(campaign_local_settings ->> 'logoTextColor')
on conflict (campaign_id) do nothing;

with corrected as (
update public.campaigns c
set heading_text_color = b.displayed_color
from public.tropical_title_color_786_backup b
where c.id = b.campaign_id
  and not b.applied
  and c.game_type = 'wheel'
  and c.campaign_local_settings ->> 'gamePageTemplateId' = 'travel-tropical'
  and c.campaign_local_settings ->> 'logoTextColor' = b.displayed_color
  and c.heading_text_color = b.old_heading_color
returning c.id
)
update public.tropical_title_color_786_backup b set applied = true
from corrected where b.campaign_id = corrected.id;
commit;
