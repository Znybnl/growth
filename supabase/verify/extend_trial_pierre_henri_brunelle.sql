-- Prolongation ponctuelle de la période d'essai de 30 jours.
-- À exécuter dans l'éditeur SQL Supabase de la base de production.
-- Le script échoue volontairement si l'adresse ne correspond pas à un seul compte.

begin;

do $$
declare
  target_count integer;
begin
  select count(distinct m.id)
    into target_count
  from public.merchants m
  join public.merchant_users u on u.merchant_id = m.id
  where lower(trim(u.email)) = lower('pierre-henri.brunelle@krys-group.com');

  if target_count <> 1 then
    raise exception
      'Compte introuvable ou adresse non unique (% comptes correspondants).',
      target_count;
  end if;
end;
$$;

with target as (
  select distinct m.id
  from public.merchants m
  join public.merchant_users u on u.merchant_id = m.id
  where lower(trim(u.email)) = lower('pierre-henri.brunelle@krys-group.com')
)
update public.merchants m
set trial_end_date = coalesce(m.trial_end_date, now()) + interval '30 days'
from target
where m.id = target.id
returning m.id, m.trial_end_date;

commit;
