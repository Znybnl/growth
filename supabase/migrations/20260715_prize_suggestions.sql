create table if not exists public.prize_suggestions (
  id text primary key,
  industry text not null,
  label text not null check (char_length(trim(label)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 280),
  probability numeric(5,2) not null check (probability >= 0 and probability <= 100),
  estimated_unit_cost numeric(10,2) not null default 0 check (estimated_unit_cost >= 0),
  icon text not null default 'gift' check (icon in ('coffee', 'dessert', 'drink', 'discount', 'supplement', 'menu', 'gift')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prize_suggestions_industry_active_sort_idx
  on public.prize_suggestions (lower(industry), is_active, sort_order, created_at);

alter table public.prize_suggestions enable row level security;

-- The application accesses this catalogue through authenticated server routes.
-- No direct browser policy is exposed, preventing a merchant from modifying it.

insert into public.prize_suggestions (
  id, industry, label, description, probability, estimated_unit_cost, icon, is_active, sort_order
) values
  ('ps-restaurant-coffee', 'Restauration', 'Un café offert', 'Un geste simple, facile à délivrer au comptoir.', 20, 0.70, 'coffee', true, 10),
  ('ps-restaurant-dessert', 'Restauration', 'Un dessert offert', 'Une attention à forte valeur perçue pour une prochaine visite.', 10, 3.50, 'dessert', true, 20),
  ('ps-restaurant-drink', 'Restauration', 'Une boisson offerte', 'Idéal pour créer un retour rapide en établissement.', 12, 1.50, 'drink', true, 30),
  ('ps-restaurant-discount-10', 'Restauration', 'Une réduction de 10 %', 'Un avantage immédiat, simple à expliquer et à utiliser.', 50, 2.00, 'discount', true, 40),
  ('ps-restaurant-supplement', 'Restauration', 'Un supplément offert', 'Un avantage maîtrisé, facile à intégrer à une commande.', 15, 1.20, 'supplement', true, 50),
  ('ps-restaurant-daily-menu', 'Restauration', 'Menu du jour offert', 'Entrée + plat ou plat + dessert, pour une prochaine visite.', 2, 12.00, 'menu', true, 60)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  probability = excluded.probability,
  estimated_unit_cost = excluded.estimated_unit_cost,
  icon = excluded.icon,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());
