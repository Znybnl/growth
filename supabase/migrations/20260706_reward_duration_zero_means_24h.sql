do $migration$
declare
  v_function_sql text;
  v_updated_function_sql text;
begin
  select pg_get_functiondef(
    'public.finalize_draw_session_and_create_lead(text, text, text, text, boolean)'::regprocedure
  )
    into v_function_sql;

  if v_function_sql is null then
    raise exception 'Function public.finalize_draw_session_and_create_lead(text, text, text, text, boolean) not found';
  end if;

  v_updated_function_sql := replace(
    v_function_sql,
    $old$    v_expires_at :=
      case
        when v_campaign.availability_duration_days > 0
          then v_available_at + make_interval(days => v_campaign.availability_duration_days)
        else v_now + make_interval(mins => v_campaign.reward_expiry_minutes)
      end;$old$,
    $new$    v_expires_at :=
      v_available_at + make_interval(days => greatest(coalesce(v_campaign.availability_duration_days, 0), 1));$new$
  );

  if v_updated_function_sql = v_function_sql then
    raise exception 'Could not update reward expiration logic in finalize_draw_session_and_create_lead';
  end if;

  execute v_updated_function_sql;
end
$migration$;
