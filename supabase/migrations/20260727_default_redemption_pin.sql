-- Initialise le PIN commerçant par défaut pour les comptes sans PIN configuré.
-- Le hash correspond à 0000 avec le format scrypt utilisé par l'application
-- (salt:hex). Chaque commerçant doit remplacer ce PIN dès que possible.

alter table public.merchants
  alter column redemption_pin_hash set default 'okado-default-pin-20260727:d74510450c66e585bbb51a939af49cd25f95fe354ad7792d0d83d961f4a125f72ab47cdad1f8eab918bf690cc2c10566d0e1a677a24426b0b343faa19637e5e1';

update public.merchants
set redemption_pin_hash = 'okado-default-pin-20260727:d74510450c66e585bbb51a939af49cd25f95fe354ad7792d0d83d961f4a125f72ab47cdad1f8eab918bf690cc2c10566d0e1a677a24426b0b343faa19637e5e1'
where redemption_pin_hash is null
   or btrim(redemption_pin_hash) = '';
