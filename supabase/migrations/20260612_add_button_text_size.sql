begin;

alter table public.campaigns
add column if not exists button_text_size_px integer not null default 18;

comment on column public.campaigns.button_text_size_px is 'Taille de police du bouton public en pixels.';

commit;
