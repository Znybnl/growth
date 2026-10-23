-- Read-only deployment verification: definitions and grants, no draw or stock write.
do $check$
declare
  v_signature text;
  v_role text;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.create_draw_session(text,text)',
    'public.draw_campaign_prize_and_create_lead(text,text,text,text,boolean)',
    'public.select_guaranteed_campaign_prize(text)'
  ] loop
    if to_regprocedure(v_signature) is null then
      raise exception 'Missing draw function: %', v_signature;
    end if;
    if not has_function_privilege('service_role', v_signature, 'execute') then
      raise exception 'Missing service execution grant';
    end if;
    foreach v_role in array array['anon','authenticated'] loop
      if has_function_privilege(v_role, v_signature, 'execute') then
        raise exception 'Unexpected public draw access: %', v_role;
      end if;
    end loop;
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    if v_signature like '%select_guaranteed_campaign_prize%' then
      if position('p.probability > 0' in v_definition) = 0
         or position('v_cursor / v_total' in v_definition) = 0 then
        raise exception 'Unexpected guaranteed selector version';
      end if;
    elsif position('public.select_guaranteed_campaign_prize(p_campaign_id)' in v_definition) = 0 then
      raise exception 'Draw function does not use the corrected selector';
    end if;
  end loop;
end;
$check$;
