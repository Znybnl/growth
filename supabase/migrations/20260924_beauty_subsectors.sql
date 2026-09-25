-- Additive and backward-compatible. If the app release is rolled back, keep
-- these nullable columns and index in place; removing them would discard the
-- new merchant/catalog selections and is not required for the old app to run.

alter table public.merchants
  add column if not exists industry_subsector text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchants_beauty_subsector_check'
      and conrelid = 'public.merchants'::regclass
  ) then
    alter table public.merchants
      add constraint merchants_beauty_subsector_check
      check (
        industry_subsector is null
        or (
          industry is not null
          and
          industry = 'Beauté'
          and industry_subsector in (
            'Coiffure',
            'Institut & soins',
            'Ongles & cils',
            'Massage & spa'
          )
        )
      );
  end if;
end;
$$;

alter table public.prize_suggestions
  add column if not exists industry_subsector text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prize_suggestions_beauty_subsector_check'
      and conrelid = 'public.prize_suggestions'::regclass
  ) then
    alter table public.prize_suggestions
      add constraint prize_suggestions_beauty_subsector_check
      check (
        industry_subsector is null
        or (
          industry is not null
          and
          industry = 'Beauté'
          and industry_subsector in (
            'Coiffure',
            'Institut & soins',
            'Ongles & cils',
            'Massage & spa'
          )
        )
      );
  end if;
end;
$$;

create index if not exists prize_suggestions_industry_subsector_active_sort_idx
  on public.prize_suggestions (
    lower(industry),
    industry_subsector,
    is_active,
    sort_order,
    created_at
  );
