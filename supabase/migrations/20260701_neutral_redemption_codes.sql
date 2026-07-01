create or replace function public.generate_neutral_redemption_code()
returns text
language plpgsql
as $function$
declare
  v_code text;
begin
  loop
    v_code := concat('OK-', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
    exit when not exists (
      select 1
        from public.leads as existing_leads
       where existing_leads.redemption_code = v_code
    );
  end loop;

  return v_code;
end;
$function$;

create or replace function public.normalize_lead_redemption_code()
returns trigger
language plpgsql
as $function$
begin
  if new.redemption_code is not null and new.redemption_code like 'SORA-%' then
    new.redemption_code := public.generate_neutral_redemption_code();
  end if;

  return new;
end;
$function$;

drop trigger if exists normalize_lead_redemption_code_trigger on public.leads;

create trigger normalize_lead_redemption_code_trigger
before insert or update of redemption_code on public.leads
for each row
execute function public.normalize_lead_redemption_code();

comment on function public.generate_neutral_redemption_code()
  is 'Génère un code de retrait neutre sans référence à une marque de démonstration.';
