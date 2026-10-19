-- Issue #466: contract AFTER deployment of the six-category-compatible application.
-- Run after 20261006_beauty_catalog_466.sql and the approved reclassification.
-- No profile, suggestion, campaign, prize or gain row is changed or deleted.
begin;
set local lock_timeout = '5s';
lock table public.merchants, public.prize_suggestions in share row exclusive mode;

do $$
declare
  allowed text[] := array[
    'Beauté généraliste / multi-activité', 'Coiffure', 'Ongles',
    'Regard — cils & sourcils', 'Massage & Spa', 'Soins visage & corps'
  ];
  legacy text;
  allowed_sql text;
  table_name text;
begin
  -- Check again under lock, including inactive/custom suggestions. Preserve any
  -- newly referenced historical value rather than reclassifying/deleting data.
  foreach legacy in array array['Institut & soins', 'Ongles & cils', 'Massage & spa'] loop
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
commit;
