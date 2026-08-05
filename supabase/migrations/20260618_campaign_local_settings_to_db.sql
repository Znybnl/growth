alter table public.campaigns
  add column if not exists campaign_local_settings jsonb not null default '{}'::jsonb;

comment on column public.campaigns.campaign_local_settings is
  'Réglages complémentaires de présentation et d’édition stockés en base (email, affiche, espacement, options UI).';
