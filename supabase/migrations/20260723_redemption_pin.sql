alter table public.merchants
  add column if not exists redemption_pin_hash text;

comment on column public.merchants.redemption_pin_hash is
  'Hash scrypt du PIN utilisé pour la validation express des retraits.';
