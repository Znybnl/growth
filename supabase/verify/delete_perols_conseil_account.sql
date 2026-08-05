-- Suppression définitive du compte et des données rattachées à cette adresse.
-- À exécuter dans l'éditeur SQL Supabase avec les droits postgres/service_role.
begin;

create temp table _target_users on commit drop as
select distinct mu.id as merchant_user_id, mu.merchant_id
from public.merchant_users mu
where lower(trim(mu.email)) = lower('perols.conseil@gmail.com');

create temp table _target_merchants on commit drop as
select distinct m.id as merchant_id, m.workspace_id
from public.merchants m
join _target_users u on u.merchant_id = m.id;

-- Ne pas supprimer un commerce encore utilisé par un autre utilisateur.
do $$
begin
  if exists (
    select 1
    from public.merchant_users mu
    join _target_merchants tm on tm.merchant_id = mu.merchant_id
    where not exists (
      select 1 from _target_users tu where tu.merchant_user_id = mu.id
    )
  ) then
    raise exception 'Suppression interrompue : le commerce est partagé avec un autre utilisateur.';
  end if;
end;
$$;

create temp table _target_campaigns on commit drop as
select c.id as campaign_id
from public.campaigns c
join _target_merchants tm on tm.merchant_id = c.merchant_id;

create temp table _target_leads on commit drop as
select l.id as lead_id
from public.leads l
join _target_campaigns tc on tc.campaign_id = l.campaign_id;

-- Ces tables ne suppriment pas toujours leurs lignes par cascade.
delete from public.business_logs
where merchant_id in (select merchant_id from _target_merchants)
   or campaign_id in (select campaign_id from _target_campaigns)
   or lead_id in (select lead_id from _target_leads);

delete from public.background_assets
where created_by_user_id in (select merchant_user_id from _target_users);

delete from public.daily_participation_locks
where campaign_id in (select campaign_id from _target_campaigns);

do $$
begin
  if to_regclass('public.reward_email_events') is not null
     and to_regclass('public.reward_email_deliveries') is not null then
    execute $sql$
      delete from public.reward_email_events
      where reward_email_delivery_id in (
        select id from public.reward_email_deliveries
        where campaign_id in (select campaign_id from pg_temp._target_campaigns)
           or lead_id in (select lead_id from pg_temp._target_leads)
      )
    $sql$;
  end if;

  if to_regclass('public.reward_email_deliveries') is not null then
    execute $sql$
      delete from public.reward_email_deliveries
      where campaign_id in (select campaign_id from pg_temp._target_campaigns)
         or lead_id in (select lead_id from pg_temp._target_leads)
    $sql$;
  end if;
end;
$$;

-- Les campagnes, lots, leads, participations et audits associés sont supprimés
-- par les contraintes ON DELETE CASCADE du marchand.
delete from public.merchant_users
where id in (select merchant_user_id from _target_users);

delete from public.merchants
where id in (select merchant_id from _target_merchants);

-- Supprime uniquement les espaces devenus orphelins.
delete from public.merchant_workspaces mw
where mw.id in (select workspace_id from _target_merchants where workspace_id is not null)
  and not exists (select 1 from public.merchants m where m.workspace_id = mw.id)
  and not exists (select 1 from public.merchant_workspace_memberships x where x.workspace_id = mw.id);

-- Supprime le compte Supabase Auth (identités, sessions et tokens en cascade).
delete from auth.users au
where lower(au.email) = lower('perols.conseil@gmail.com')
   or au.raw_app_meta_data ->> 'merchant_user_id' in (
     select merchant_user_id from _target_users
   );

select
  (select count(*) from _target_users) as merchant_users_found,
  (select count(*) from _target_merchants) as merchants_found,
  (select count(*) from _target_campaigns) as campaigns_found,
  'Suppression effectuée' as status;

commit;
