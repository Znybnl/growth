-- #792: suggestions only; existing campaign prizes and custom suggestions stay untouched.
begin;

insert into public.prize_suggestions
  (id, industry, industry_subsector, label, description, probability, estimated_unit_cost, icon, is_active, sort_order)
values
  ('ps-792-travel-goodie', 'Agences de voyage', null, 'GOODIE', 'Un objet promotionnel offert, choisi par l’établissement.', 15, 0, 'gift', true, 10),
  ('ps-792-travel-tote-bag', 'Agences de voyage', null, 'TOTE BAG', 'Un sac tote bag offert, choisi par l’établissement.', 15, 0, 'gift', true, 20),
  ('ps-792-travel-surprise', 'Agences de voyage', null, 'SURPRISE', 'Une surprise offerte, choisie par l’établissement.', 15, 0, 'gift', true, 30)
on conflict (id) do nothing;

commit;

-- Rollback, after checking that these catalogue entries have not been customised:
-- delete from public.prize_suggestions where industry = 'Agences de voyage'
--   and id in ('ps-792-travel-goodie', 'ps-792-travel-tote-bag', 'ps-792-travel-surprise');
