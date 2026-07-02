do $$
declare
  v_function_sql text;
begin
  select pg_get_functiondef('public.finalize_draw_session_and_create_lead(text, text, text, text, boolean)'::regprocedure)
    into v_function_sql;

  if v_function_sql is null then
    raise exception 'Function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) not found';
  end if;

  execute replace(v_function_sql, 'concat(''SORA-'',', 'concat(''OK-'',');
end $$;
