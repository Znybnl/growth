-- Issue #466. Run after a catalog backup, before deploying the new application.
-- No campaign/prize/gain/stock table is read or written by this migration.
begin;
lock table public.merchants, public.prize_suggestions in share row exclusive mode;

-- Private rollback snapshot: only untouched standard catalog rows removed below.
create table if not exists public.beauty_catalog_466_backup (
  id text primary key,
  row_data jsonb not null
);
alter table public.beauty_catalog_466_backup enable row level security;
revoke all on public.beauty_catalog_466_backup from public, anon, authenticated;

with original(id, label, description, probability, estimated_unit_cost, icon, sort_order) as (
  values
  ('ps-beauty-discount-10', 'Une réduction de 10 %', 'Valable sur la prochaine prestation, pour encourager un retour rapide.', 40, 3, 'discount', 10),
  ('ps-beauty-mini-product', 'Un échantillon offert', 'Format découverte ou échantillon premium à remettre au salon.', 40, 2.5, 'gift', 20),
  ('ps-beauty-upgrade', 'Un supplément soin offert', 'Un massage, une pose de masque ou une finition offerte selon la prestation.', 15, 6, 'supplement', 30),
  ('ps-beauty-credit-15', '15€ offerts sur une prestation', 'Un crédit à utiliser lors d''un prochain rendez-vous.', 10, 15, 'discount', 40),
  ('ps-beauty-premium-treatment', 'Un soin premium offert', 'Un soin ciblé à forte valeur perçue, à réserver selon les disponibilités.', 5, 25, 'dessert', 50),
  ('ps-beauty-box', 'Une trousse beauté offerte', 'Une sélection de produits ou accessoires du salon.', 5, 35, 'gift', 60),
  ('ps-beauty-signature', 'Une prestation signature offerte', 'Le gros lot : une prestation complète définie par le salon.', 2, 60, 'dessert', 70)
), untouched as (
  select s.* from public.prize_suggestions s join original o on o.id = s.id
  where s.industry = 'Beauté' and s.industry_subsector is null
    and s.label = o.label and s.description = o.description
    and s.probability = o.probability and s.estimated_unit_cost = o.estimated_unit_cost
    and s.icon = o.icon and s.sort_order = o.sort_order and s.is_active = true
)
insert into public.beauty_catalog_466_backup(id, row_data)
select id, to_jsonb(untouched) from untouched on conflict (id) do nothing;

-- Delete only rows STILL identical to the snapshot; preserve later admin changes.
delete from public.prize_suggestions s using public.beauty_catalog_466_backup b
where s.id = b.id and to_jsonb(s) = b.row_data;

-- Six new choices. Legacy ambiguous choices exist ONLY if referenced by a saved
-- establishment or preserved suggestion; never classify a merchant arbitrarily.
-- The old Massage spelling remains accepted for expand/contract compatibility.
do $$
declare
  allowed text[] := array[
    'Beauté généraliste / multi-activité', 'Coiffure', 'Ongles',
    'Regard — cils & sourcils', 'Massage & Spa', 'Soins visage & corps', 'Massage & spa'
  ];
  legacy text;
  allowed_sql text;
  table_name text;
begin
  foreach legacy in array array['Institut & soins', 'Ongles & cils'] loop
    if exists (select 1 from public.merchants where industry_subsector = legacy)
      or exists (select 1 from public.prize_suggestions where industry_subsector = legacy) then
      allowed := array_append(allowed, legacy);
    end if;
  end loop;
  select string_agg(quote_literal(value), ', ') into allowed_sql from unnest(allowed) value;
  foreach table_name in array array['merchants', 'prize_suggestions'] loop
    execute format('alter table public.%I drop constraint if exists %I', table_name, table_name || '_beauty_subsector_check');
    execute format(
      'alter table public.%I add constraint %I check (industry_subsector is null or (industry is not null and industry = ''Beauté'' and industry_subsector in (%s)))',
      table_name, table_name || '_beauty_subsector_check', allowed_sql
    );
  end loop;
end;
$$;

-- Stable identities + DO NOTHING preserve any later customizations on rerun.
insert into public.prize_suggestions (
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
commit;
