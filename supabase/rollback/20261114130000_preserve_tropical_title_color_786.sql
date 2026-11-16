-- Restore only untouched migrated fields; run after reverting the renderer fix.
begin;
update public.campaigns c
set heading_text_color = b.old_heading_color
from public.tropical_title_color_786_backup b
where c.id = b.campaign_id and b.applied and c.heading_text_color = b.displayed_color;
commit;
