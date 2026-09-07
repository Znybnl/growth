alter table public.merchants
  add column if not exists redemption_pin_encrypted text;

alter table public.merchants
  alter column redemption_pin_hash set default 'okado-default-pin-20260727:d74510450c66e585bbb51a939af49cd25f95fe354ad7792d0d83d961f4a125f72ab47cdad1f8eab918bf690cc2c10566d0e1a677a24426b0b343faa19637e5e1';

update public.merchants
set redemption_pin_hash = 'okado-default-pin-20260727:d74510450c66e585bbb51a939af49cd25f95fe354ad7792d0d83d961f4a125f72ab47cdad1f8eab918bf690cc2c10566d0e1a677a24426b0b343faa19637e5e1'
where redemption_pin_hash is null
   or btrim(redemption_pin_hash) = '';

comment on column public.merchants.redemption_pin_encrypted is
  'Encrypted four-digit merchant redemption PIN for authenticated account display; never expose publicly.';
