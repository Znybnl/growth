-- #792: suggestions only; existing campaign prizes and custom suggestions stay untouched.
begin;

insert into public.prize_suggestions
  (id, industry, industry_subsector, label, description, probability, estimated_unit_cost, icon, is_active, sort_order)
values
  ('ps-792-travel-goodie', 'Agences de voyage', null, 'GOODIE', 'Un objet promotionnel offert, choisi par l’établissement.', 15, 0, 'gift', true, 10),
  ('ps-792-travel-tote-bag', 'Agences de voyage', null, 'TOTE BAG', 'Un sac tote bag offert, choisi par l’établissement.', 15, 0, 'gift', true, 20),
  ('ps-792-travel-surprise', 'Agences de voyage', null, 'SURPRISE', 'Une surprise offerte, choisie par l’établissement.', 15, 0, 'gift', true, 30),
  ('ps-792-travel-luggage-tag', 'Agences de voyage', null, 'ÉTIQUETTE À BAGAGE', 'Une étiquette à bagage offerte, choisie par l’établissement.', 15, 0, 'gift', true, 40),
  ('ps-792-travel-passport-cover', 'Agences de voyage', null, 'PROTÈGE-PASSEPORT', 'Un protège-passeport offert, choisi par l’établissement.', 15, 0, 'gift', true, 50),
  ('ps-792-travel-kit', 'Agences de voyage', null, 'TROUSSE DE VOYAGE', 'Une trousse de voyage offerte, choisie par l’établissement.', 15, 0, 'gift', true, 60),
  ('ps-792-travel-notebook', 'Agences de voyage', null, 'CARNET DE VOYAGE', 'Un carnet de voyage offert, choisi par l’établissement.', 15, 0, 'gift', true, 70)
on conflict (id) do nothing;

commit;

-- Rollback, after checking that these catalogue entries have not been customised:
-- delete from public.prize_suggestions where industry = 'Agences de voyage'
--   and id in ('ps-792-travel-goodie', 'ps-792-travel-tote-bag', 'ps-792-travel-surprise',
--              'ps-792-travel-luggage-tag', 'ps-792-travel-passport-cover',
--              'ps-792-travel-kit', 'ps-792-travel-notebook');
