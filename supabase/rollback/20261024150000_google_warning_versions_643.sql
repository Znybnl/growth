-- Emergency rollback only: this restores the original v1-only validation and
-- will block saves with v2 acceptances again. Prefer keeping the additive fix
-- when rolling back the application. No acceptance or campaign is deleted.
begin;

create or replace function public.validate_google_click_acceptance_638()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_acceptance public.google_click_warning_acceptances%rowtype;
begin
  if coalesce((new.campaign_local_settings->>'googleClickRequired')::boolean,false) then
    select * into v_acceptance from public.google_click_warning_acceptances
      where id::text=new.campaign_local_settings->>'googleClickAcceptanceId'
      and merchant_id=new.merchant_id and warning_version='2026-10-23-v1' for update;
    if not found or (v_acceptance.campaign_id is not null and v_acceptance.campaign_id<>new.id) then
      raise exception 'Acceptez l’avertissement Google avant d’activer cette option';
    end if;
    if tg_op='UPDATE' and not coalesce((old.campaign_local_settings->>'googleClickRequired')::boolean,false)
      and old.campaign_local_settings->>'googleClickAcceptanceId'=new.campaign_local_settings->>'googleClickAcceptanceId' then
      raise exception 'Confirmez à nouveau l’avertissement pour réactiver cette option';
    end if;
    update public.google_click_warning_acceptances set campaign_id=new.id where id=v_acceptance.id;
  end if;
  return new;
end; $$;
revoke all on function public.validate_google_click_acceptance_638() from public,anon,authenticated;

commit;
