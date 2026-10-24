-- Read-only catalog checks; safe to run after the migration, without saving a game.
do $$
declare v_function record;
begin
  select p.prosrc, p.prosecdef, p.proconfig into v_function
    from pg_proc p where p.oid='public.validate_google_click_acceptance_638()'::regprocedure;
  if position('''2026-10-23-v1''' in v_function.prosrc)=0
    or position('''2026-10-23-v2''' in v_function.prosrc)=0 then
    raise exception 'Google warning compatibility migration #643 is missing';
  end if;
  if not v_function.prosecdef or not ('search_path=public'=any(v_function.proconfig)) then
    raise exception 'Unexpected Google acceptance function security configuration';
  end if;
  if not exists (
    select 1 from pg_trigger t where t.tgrelid='public.campaigns'::regclass
      and t.tgname='campaigns_google_click_acceptance_638' and t.tgenabled='O'
      and t.tgfoid='public.validate_google_click_acceptance_638()'::regprocedure
  ) then raise exception 'Google acceptance trigger is missing or disabled'; end if;
  if not (select relrowsecurity from pg_class where oid='public.google_click_warning_acceptances'::regclass)
    or has_table_privilege('anon','public.google_click_warning_acceptances','select')
    or has_table_privilege('authenticated','public.google_click_warning_acceptances','select')
    or has_function_privilege('anon','public.validate_google_click_acceptance_638()','execute')
    or has_function_privilege('authenticated','public.validate_google_click_acceptance_638()','execute') then
    raise exception 'Google acceptance privacy controls are missing';
  end if;
end $$;
