-- Emergency compatibility rollback, on owner approval: allow the three previous
-- values again, without changing data, permissions or the six new categories.
-- This deliberately expands validation; it does not undo profile reclassification.
begin;
set local lock_timeout = '5s';
lock table public.merchants, public.prize_suggestions in share row exclusive mode;
do $$
declare
  table_name text;
begin
  foreach table_name in array array['merchants', 'prize_suggestions'] loop
    execute format('alter table public.%I drop constraint if exists %I', table_name, table_name || '_beauty_subsector_check');
    execute format(
      'alter table public.%I add constraint %I check (industry_subsector is null or (industry is not null and industry = ''Beauté'' and industry_subsector in (''Beauté généraliste / multi-activité'', ''Coiffure'', ''Ongles'', ''Regard — cils & sourcils'', ''Massage & Spa'', ''Soins visage & corps'', ''Institut & soins'', ''Ongles & cils'', ''Massage & spa'')))',
      table_name, table_name || '_beauty_subsector_check'
    );
  end loop;
end;
$$;
commit;
