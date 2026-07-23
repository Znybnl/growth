-- Catalogue par défaut pour les salons de beauté.
-- Répartition complète : consolation 60 %, intermédiaire 25 %, premium 15 %.
insert into public.prize_suggestions (
  id, industry, label, description, probability, estimated_unit_cost, icon, is_active, sort_order
) values
  (
    'ps-beauty-discount-10',
    'Beauté',
    'Une réduction de 10 %',
    'Valable sur la prochaine prestation, pour encourager un retour rapide.',
    40,
    3.00,
    'discount',
    true,
    10
  ),
  (
    'ps-beauty-mini-product',
    'Beauté',
    'Un échantillon offert',
    'Format découverte ou échantillon premium à remettre au salon.',
    40,
    2.50,
    'gift',
    true,
    20
  ),
  (
    'ps-beauty-upgrade',
    'Beauté',
    'Un supplément soin offert',
    'Un massage, une pose de masque ou une finition offerte selon la prestation.',
    15,
    6.00,
    'supplement',
    true,
    30
  ),
  (
    'ps-beauty-credit-15',
    'Beauté',
    '15€ offerts sur une prestation',
    'Un crédit à utiliser lors d''un prochain rendez-vous.',
    10,
    15.00,
    'discount',
    true,
    40
  ),
  (
    'ps-beauty-premium-treatment',
    'Beauté',
    'Un soin premium offert',
    'Un soin ciblé à forte valeur perçue, à réserver selon les disponibilités.',
    5,
    25.00,
    'dessert',
    true,
    50
  ),
  (
    'ps-beauty-box',
    'Beauté',
    'Une trousse beauté offerte',
    'Une sélection de produits ou accessoires du salon.',
    5,
    35.00,
    'gift',
    true,
    60
  ),
  (
    'ps-beauty-signature',
    'Beauté',
    'Une prestation signature offerte',
    'Le gros lot : une prestation complète définie par le salon.',
    2,
    60.00,
    'dessert',
    true,
    70
  )
on conflict (id) do update set
  industry = excluded.industry,
  label = excluded.label,
  description = excluded.description,
  probability = excluded.probability,
  estimated_unit_cost = excluded.estimated_unit_cost,
  icon = excluded.icon,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

