-- #623: additive standard suggestions only. No campaign, prize, merchant or gain mutation.
begin;
create table if not exists public.prize_catalog_623_inserted (
  id text primary key,
  row_data jsonb not null
);
alter table public.prize_catalog_623_inserted enable row level security;
revoke all on public.prize_catalog_623_inserted from public, anon, authenticated;

with inserted as (
insert into public.prize_suggestions
  (id, industry, industry_subsector, label, description, probability, estimated_unit_cost, icon, is_active, sort_order)
values
  ('ps-623-hair-option', 'Beauté', 'Coiffure', 'OPTION OFFERTE', 'Une option sélectionnée par l’établissement, avec une prestation payante du même univers.', 15, 3, 'gift', true, 200),
  ('ps-623-hair-gift', 'Beauté', 'Coiffure', 'PRODUIT DÉCOUVERTE OFFERT', 'Un produit ou échantillon découverte sélectionné par l’établissement.', 15, 5, 'gift', true, 201),
  ('ps-623-nails-option', 'Beauté', 'Ongles', 'OPTION OFFERTE', 'Une option sélectionnée par l’établissement, avec une prestation payante du même univers.', 15, 3, 'gift', true, 202),
  ('ps-623-nails-gift', 'Beauté', 'Ongles', 'PRODUIT DÉCOUVERTE OFFERT', 'Un produit ou échantillon découverte sélectionné par l’établissement.', 15, 5, 'gift', true, 203),
  ('ps-623-eyes-option', 'Beauté', 'Regard — cils & sourcils', 'OPTION OFFERTE', 'Une option sélectionnée par l’établissement, avec une prestation payante du même univers.', 15, 3, 'gift', true, 204),
  ('ps-623-eyes-gift', 'Beauté', 'Regard — cils & sourcils', 'PRODUIT DÉCOUVERTE OFFERT', 'Un produit ou échantillon découverte sélectionné par l’établissement.', 15, 5, 'gift', true, 205),
  ('ps-623-spa-option', 'Beauté', 'Massage & Spa', 'OPTION OFFERTE', 'Une option sélectionnée par l’établissement, avec une prestation payante du même univers.', 15, 3, 'gift', true, 206),
  ('ps-623-spa-gift', 'Beauté', 'Massage & Spa', 'PRODUIT DÉCOUVERTE OFFERT', 'Un produit ou échantillon découverte sélectionné par l’établissement.', 15, 5, 'gift', true, 207),
  ('ps-623-care-gift', 'Beauté', 'Soins visage & corps', 'PRODUIT DÉCOUVERTE OFFERT', 'Un produit ou échantillon découverte sélectionné par l’établissement.', 15, 5, 'gift', true, 209),
  ('ps-623-auto-discount-small', 'Automobile', null, '-5% PRESTATION', 'Valable sur une prestation à tarif normal, parmi la sélection définie par l’établissement.', 15, 5, 'discount', true, 210),
  ('ps-623-auto-discount-large', 'Automobile', null, '-10% PRESTATION', 'Valable sur une prestation à tarif normal, parmi la sélection définie par l’établissement.', 15, 10, 'discount', true, 211),
  ('ps-623-auto-extra', 'Automobile', null, 'AVANTAGE COMPLÉMENTAIRE', 'Un avantage sélectionné par l’établissement, avec un achat ou une prestation payante.', 15, 4, 'gift', true, 212),
  ('ps-623-auto-credit', 'Automobile', null, 'BON DE 5 €', '5 € de réduction sur une prestation à tarif normal.', 15, 5, 'discount', true, 213),
  ('ps-623-retail-discount-small', 'Retail', null, '-5% ACHAT', 'Valable sur un achat à tarif normal, parmi la sélection définie par l’établissement.', 15, 3, 'discount', true, 214),
  ('ps-623-retail-discount-large', 'Retail', null, '-10% ACHAT', 'Valable sur un achat à tarif normal, parmi la sélection définie par l’établissement.', 15, 6, 'discount', true, 215),
  ('ps-623-retail-extra', 'Retail', null, 'CADEAU OFFERT', 'Un avantage sélectionné par l’établissement, avec un achat ou une prestation payante.', 15, 2, 'gift', true, 216),
  ('ps-623-retail-credit', 'Retail', null, 'BON DE 5 €', '5 € de réduction sur un achat à tarif normal.', 15, 5, 'discount', true, 217),
  ('ps-623-sport-discount-small', 'Sport', null, '-10% ACTIVITÉ', 'Valable sur une activité à tarif normal, parmi la sélection définie par l’établissement.', 15, 4, 'discount', true, 218),
  ('ps-623-sport-discount-large', 'Sport', null, '-15% ACTIVITÉ', 'Valable sur une activité à tarif normal, parmi la sélection définie par l’établissement.', 15, 8, 'discount', true, 219),
  ('ps-623-sport-extra', 'Sport', null, 'AVANTAGE COMPLÉMENTAIRE', 'Un avantage sélectionné par l’établissement, avec un achat ou une prestation payante.', 15, 3, 'gift', true, 220),
  ('ps-623-sport-credit', 'Sport', null, 'BON DE 5 €', '5 € de réduction sur une activité à tarif normal.', 15, 5, 'discount', true, 221),
  ('ps-623-services-discount-small', 'Services', null, '-5% PRESTATION', 'Valable sur une prestation à tarif normal, parmi la sélection définie par l’établissement.', 15, 4, 'discount', true, 222),
  ('ps-623-services-discount-large', 'Services', null, '-10% PRESTATION', 'Valable sur une prestation à tarif normal, parmi la sélection définie par l’établissement.', 15, 8, 'discount', true, 223),
  ('ps-623-services-extra', 'Services', null, 'AVANTAGE COMPLÉMENTAIRE', 'Un avantage sélectionné par l’établissement, avec un achat ou une prestation payante.', 15, 3, 'gift', true, 224),
  ('ps-623-services-credit', 'Services', null, 'BON DE 5 €', '5 € de réduction sur une prestation à tarif normal.', 15, 5, 'discount', true, 225),
  ('ps-623-hotel-discount-small', 'Hôtellerie', null, '-5% SÉJOUR', 'Valable sur un séjour à tarif normal, parmi la sélection définie par l’établissement.', 15, 8, 'discount', true, 226),
  ('ps-623-hotel-discount-large', 'Hôtellerie', null, '-10% SÉJOUR', 'Valable sur un séjour à tarif normal, parmi la sélection définie par l’établissement.', 15, 16, 'discount', true, 227),
  ('ps-623-hotel-extra', 'Hôtellerie', null, 'AVANTAGE COMPLÉMENTAIRE', 'Un avantage sélectionné par l’établissement, avec un achat ou une prestation payante.', 15, 7, 'gift', true, 228),
  ('ps-623-hotel-credit', 'Hôtellerie', null, 'BON DE 10 €', '10 € de réduction sur un séjour à tarif normal.', 15, 10, 'discount', true, 229),
  ('ps-623-food-discount-small', 'Restauration', null, '-10% COMMANDE', 'Valable sur une commande à tarif normal, hors produits exclus par l’établissement.', 15, 3, 'discount', true, 230),
  ('ps-623-food-discount-large', 'Restauration', null, '-15% COMMANDE', 'Valable sur une commande à tarif normal, hors produits exclus par l’établissement.', 15, 5, 'discount', true, 231),
  ('ps-623-food-drink', 'Restauration', null, 'BOISSON OFFERTE', 'Une boisson sans alcool sélectionnée par l’établissement, avec une commande payante.', 15, 1.5, 'drink', true, 232),
  ('ps-623-food-coffee', 'Restauration', null, 'BOISSON CHAUDE OFFERTE', 'Une boisson chaude sélectionnée par l’établissement, avec une commande payante.', 15, 1, 'coffee', true, 233),
  ('ps-623-food-sweet', 'Restauration', null, 'GOURMANDISE OFFERTE', 'Une gourmandise ou un dessert sélectionné par l’établissement, avec une commande payante.', 15, 3, 'dessert', true, 234),
  ('ps-623-food-extra', 'Restauration', null, 'SUPPLÉMENT OFFERT', 'Un supplément sélectionné par l’établissement, avec une commande payante.', 15, 1, 'supplement', true, 235)
on conflict (id) do nothing
returning *
)
insert into public.prize_catalog_623_inserted(id, row_data)
select id, to_jsonb(inserted) from inserted
on conflict (id) do update set row_data = excluded.row_data;
commit;
