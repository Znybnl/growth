-- Issue #466: optional catalog rollback, ONLY after owner approval.
-- Keep expanded constraints and the private backup: saved profiles/custom entries
-- must remain valid. Never modify campaigns, prizes, gains or merchant rows.
begin;
lock table public.prize_suggestions in share row exclusive mode;
create temporary table beauty_catalog_466_expected
  (like public.prize_suggestions including defaults including indexes) on commit drop;
insert into beauty_catalog_466_expected (
  id, industry, industry_subsector, label, description, probability,
  estimated_unit_cost, icon, is_active, sort_order
) values
  ('ps-beauty-466-general-1', 'Beauté', 'Beauté généraliste / multi-activité', '-10% PRESTATION', 'Valable sur une prestation à tarif normal.', 20, 5, 'discount', true, 10),
  ('ps-beauty-466-general-2', 'Beauté', 'Beauté généraliste / multi-activité', '-15% PRESTATION', 'Valable sur une prestation à tarif normal.', 15, 7, 'discount', true, 20),
  ('ps-beauty-466-general-3', 'Beauté', 'Beauté généraliste / multi-activité', '-20% PRESTATION', 'Valable sur une prestation à tarif normal.', 10, 10, 'discount', true, 30),
  ('ps-beauty-466-general-4', 'Beauté', 'Beauté généraliste / multi-activité', '-25% PRESTATION', 'Valable sur une prestation à tarif normal.', 5, 13, 'discount', true, 40),
  ('ps-beauty-466-general-5', 'Beauté', 'Beauté généraliste / multi-activité', 'OPTION OFFERTE', 'Valable avec une prestation payante.', 15, 4, 'gift', true, 50),
  ('ps-beauty-466-general-6', 'Beauté', 'Beauté généraliste / multi-activité', 'SUPPLÉMENT OFFERT', 'Valable avec une prestation payante.', 12, 5, 'gift', true, 60),
  ('ps-beauty-466-general-7', 'Beauté', 'Beauté généraliste / multi-activité', 'PRODUIT OFFERT', 'Valable sur un produit sélectionné par l’établissement, dans la limite des stocks disponibles.', 5, 8, 'gift', true, 70),
  ('ps-beauty-466-hair-1', 'Beauté', 'Coiffure', 'BRUSHING OFFERT', 'Valable sur un brushing standard.', 3, 12, 'gift', true, 10),
  ('ps-beauty-466-hair-2', 'Beauté', 'Coiffure', 'SOIN OFFERT', 'Valable avec une prestation coiffure payante.', 15, 4, 'gift', true, 20),
  ('ps-beauty-466-hair-3', 'Beauté', 'Coiffure', 'SOIN PROFOND', 'Valable avec une prestation coiffure payante.', 8, 8, 'gift', true, 30),
  ('ps-beauty-466-hair-4', 'Beauté', 'Coiffure', 'MASSAGE 10 MIN', '10 minutes offertes avec une prestation coiffure payante.', 12, 4, 'gift', true, 40),
  ('ps-beauty-466-hair-5', 'Beauté', 'Coiffure', '-20% PATINE', 'Valable sur une patine à tarif normal.', 8, 8, 'discount', true, 50),
  ('ps-beauty-466-hair-6', 'Beauté', 'Coiffure', '-20% COUPE', 'Valable sur une coupe à tarif normal.', 8, 7, 'discount', true, 60),
  ('ps-beauty-466-hair-7', 'Beauté', 'Coiffure', '-15% COULEUR', 'Valable sur une prestation couleur à tarif normal.', 8, 10, 'discount', true, 70),
  ('ps-beauty-466-hair-8', 'Beauté', 'Coiffure', '-10% COIFFURE', 'Valable sur une prestation coiffure à tarif normal.', 20, 6, 'discount', true, 80),
  ('ps-beauty-466-hair-9', 'Beauté', 'Coiffure', '-15% COIFFURE', 'Valable sur une prestation coiffure à tarif normal.', 15, 9, 'discount', true, 90),
  ('ps-beauty-466-hair-10', 'Beauté', 'Coiffure', '-20% COIFFURE', 'Valable sur une prestation coiffure à tarif normal.', 10, 12, 'discount', true, 100),
  ('ps-beauty-466-nails-1', 'Beauté', 'Ongles', 'POSE OFFERTE', 'Valable sur une pose semi-permanente mains, couleur unie.', 3, 15, 'gift', true, 10),
  ('ps-beauty-466-nails-2', 'Beauté', 'Ongles', '-20% SEMI', 'Valable sur une pose semi-permanente à tarif normal.', 10, 8, 'discount', true, 20),
  ('ps-beauty-466-nails-3', 'Beauté', 'Ongles', '-20% GAINAGE', 'Valable sur un gainage à tarif normal.', 10, 10, 'discount', true, 30),
  ('ps-beauty-466-nails-4', 'Beauté', 'Ongles', 'DÉPOSE OFFERTE', 'Valable avec une nouvelle pose réalisée lors du même rendez-vous.', 15, 4, 'gift', true, 40),
  ('ps-beauty-466-nails-5', 'Beauté', 'Ongles', 'FRENCH OFFERTE', 'Valable avec une pose payante.', 15, 3, 'gift', true, 50),
  ('ps-beauty-466-nails-6', 'Beauté', 'Ongles', 'BABYBOOMER OFFERT', 'Valable avec une pose payante.', 12, 4, 'gift', true, 60),
  ('ps-beauty-466-nails-7', 'Beauté', 'Ongles', 'NAIL ART OFFERT', 'Jusqu’à 2 ongles, avec une pose payante.', 15, 2, 'gift', true, 70),
  ('ps-beauty-466-nails-8', 'Beauté', 'Ongles', 'CHROME OFFERT', 'Effet chrome offert avec une pose payante.', 15, 2, 'gift', true, 80),
  ('ps-beauty-466-nails-9', 'Beauté', 'Ongles', 'RÉPARATION OFFERTE', 'Réparation d’un ongle offerte avec une prestation ongles payante.', 12, 3, 'gift', true, 90),
  ('ps-beauty-466-nails-10', 'Beauté', 'Ongles', '-10% ONGLES', 'Valable sur une prestation ongles à tarif normal.', 20, 4, 'discount', true, 100),
  ('ps-beauty-466-nails-11', 'Beauté', 'Ongles', '-15% ONGLES', 'Valable sur une prestation ongles à tarif normal.', 15, 6, 'discount', true, 110),
  ('ps-beauty-466-nails-12', 'Beauté', 'Ongles', '-20% ONGLES', 'Valable sur une prestation ongles à tarif normal.', 10, 8, 'discount', true, 120),
  ('ps-beauty-466-eyes-1', 'Beauté', 'Regard — cils & sourcils', 'BROW LIFT OFFERT', 'Valable sur un Brow Lift standard.', 3, 18, 'gift', true, 10),
  ('ps-beauty-466-eyes-2', 'Beauté', 'Regard — cils & sourcils', 'LASH LIFT OFFERT', 'Valable sur un Lash Lift standard.', 3, 20, 'gift', true, 20),
  ('ps-beauty-466-eyes-3', 'Beauté', 'Regard — cils & sourcils', 'TEINTURE OFFERTE', 'Valable avec un Brow Lift ou Lash Lift payant.', 15, 3, 'gift', true, 30),
  ('ps-beauty-466-eyes-4', 'Beauté', 'Regard — cils & sourcils', 'ÉPILATION OFFERTE', 'Épilation des sourcils offerte avec une prestation regard payante.', 15, 4, 'gift', true, 40),
  ('ps-beauty-466-eyes-5', 'Beauté', 'Regard — cils & sourcils', 'SOIN KÉRATINE', 'Valable avec un Brow Lift ou Lash Lift payant.', 12, 3, 'gift', true, 50),
  ('ps-beauty-466-eyes-6', 'Beauté', 'Regard — cils & sourcils', 'DÉPOSE OFFERTE', 'Valable avec une nouvelle pose d’extensions de cils.', 10, 5, 'gift', true, 60),
  ('ps-beauty-466-eyes-7', 'Beauté', 'Regard — cils & sourcils', '-20% REMPLISSAGE', 'Valable sur un remplissage de cils à tarif normal.', 8, 8, 'discount', true, 70),
  ('ps-beauty-466-eyes-8', 'Beauté', 'Regard — cils & sourcils', '-20% POSE CILS', 'Valable sur une pose complète de cils à tarif normal.', 5, 12, 'discount', true, 80),
  ('ps-beauty-466-eyes-9', 'Beauté', 'Regard — cils & sourcils', '-10% REGARD', 'Valable sur une prestation regard à tarif normal.', 20, 5, 'discount', true, 90),
  ('ps-beauty-466-eyes-10', 'Beauté', 'Regard — cils & sourcils', '-15% REGARD', 'Valable sur une prestation regard à tarif normal.', 15, 7, 'discount', true, 100),
  ('ps-beauty-466-eyes-11', 'Beauté', 'Regard — cils & sourcils', '-20% REGARD', 'Valable sur une prestation regard à tarif normal.', 10, 10, 'discount', true, 110),
  ('ps-beauty-466-spa-1', 'Beauté', 'Massage & Spa', '30 MIN OFFERTES', 'Valable sur un massage de 30 minutes standard.', 3, 20, 'gift', true, 10),
  ('ps-beauty-466-spa-2', 'Beauté', 'Massage & Spa', '15 MIN OFFERTES', '15 minutes ajoutées à un massage payant d’au moins 45 minutes.', 8, 9, 'gift', true, 20),
  ('ps-beauty-466-spa-3', 'Beauté', 'Massage & Spa', '10 MIN OFFERTES', '10 minutes ajoutées à un massage payant.', 15, 6, 'gift', true, 30),
  ('ps-beauty-466-spa-4', 'Beauté', 'Massage & Spa', 'GOMMAGE OFFERT', 'Valable avec un massage ou un rituel payant.', 10, 7, 'gift', true, 40),
  ('ps-beauty-466-spa-5', 'Beauté', 'Massage & Spa', 'ACCÈS SPA OFFERT', 'Valable avec une prestation payante, selon les équipements disponibles.', 8, 8, 'gift', true, 50),
  ('ps-beauty-466-spa-6', 'Beauté', 'Massage & Spa', '-20% RITUEL', 'Valable sur un rituel corps ou spa à tarif normal.', 8, 15, 'discount', true, 60),
  ('ps-beauty-466-spa-7', 'Beauté', 'Massage & Spa', '-15% MASSAGE DUO', 'Valable sur un massage duo à tarif normal.', 8, 12, 'discount', true, 70),
  ('ps-beauty-466-spa-8', 'Beauté', 'Massage & Spa', '-10% MASSAGE', 'Valable sur un massage à tarif normal.', 20, 7, 'discount', true, 80),
  ('ps-beauty-466-spa-9', 'Beauté', 'Massage & Spa', '-15% MASSAGE', 'Valable sur un massage à tarif normal.', 15, 10, 'discount', true, 90),
  ('ps-beauty-466-spa-10', 'Beauté', 'Massage & Spa', '-20% MASSAGE', 'Valable sur un massage à tarif normal.', 10, 14, 'discount', true, 100),
  ('ps-beauty-466-care-1', 'Beauté', 'Soins visage & corps', 'SOIN 30 MIN', 'Valable sur un soin découverte de 30 minutes.', 3, 15, 'gift', true, 10),
  ('ps-beauty-466-care-2', 'Beauté', 'Soins visage & corps', 'MASQUE OFFERT', 'Valable avec un soin visage payant.', 15, 4, 'gift', true, 20),
  ('ps-beauty-466-care-3', 'Beauté', 'Soins visage & corps', 'GOMMAGE OFFERT', 'Valable avec un soin visage ou corps payant.', 12, 5, 'gift', true, 30),
  ('ps-beauty-466-care-4', 'Beauté', 'Soins visage & corps', 'MASSAGE 10 MIN', '10 minutes offertes avec un soin visage ou corps payant.', 15, 5, 'gift', true, 40),
  ('ps-beauty-466-care-5', 'Beauté', 'Soins visage & corps', 'CONTOUR YEUX', 'Soin contour des yeux offert avec un soin visage payant.', 12, 4, 'gift', true, 50),
  ('ps-beauty-466-care-6', 'Beauté', 'Soins visage & corps', 'ZONE OFFERTE', 'Une petite zone d’épilation offerte avec une prestation d’épilation payante.', 10, 4, 'gift', true, 60),
  ('ps-beauty-466-care-7', 'Beauté', 'Soins visage & corps', 'OPTION OFFERTE', 'Une option offerte avec un soin payant.', 15, 5, 'gift', true, 70),
  ('ps-beauty-466-care-8', 'Beauté', 'Soins visage & corps', '-20% RITUEL', 'Valable sur un rituel visage ou corps à tarif normal.', 8, 15, 'discount', true, 80),
  ('ps-beauty-466-care-9', 'Beauté', 'Soins visage & corps', '-10% SOIN', 'Valable sur un soin visage ou corps à tarif normal.', 20, 6, 'discount', true, 90),
  ('ps-beauty-466-care-10', 'Beauté', 'Soins visage & corps', '-15% SOIN', 'Valable sur un soin visage ou corps à tarif normal.', 15, 9, 'discount', true, 100),
  ('ps-beauty-466-care-11', 'Beauté', 'Soins visage & corps', '-20% SOIN', 'Valable sur un soin visage ou corps à tarif normal.', 10, 12, 'discount', true, 110)
on conflict (id) do nothing;

-- Remove only unmodified entries introduced by this release.
delete from public.prize_suggestions s using beauty_catalog_466_expected e
where s.id = e.id and
  (s.industry, s.industry_subsector, s.label, s.description, s.probability,
   s.estimated_unit_cost, s.icon, s.is_active, s.sort_order)
  is not distinct from
  (e.industry, e.industry_subsector, e.label, e.description, e.probability,
   e.estimated_unit_cost, e.icon, e.is_active, e.sort_order);

-- Restore the exact previous snapshot, without overwriting any current row.
insert into public.prize_suggestions
select restored.* from public.beauty_catalog_466_backup b
cross join lateral jsonb_populate_record(null::public.prize_suggestions, b.row_data) restored
on conflict (id) do nothing;
commit;
