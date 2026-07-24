-- Lecture seule : à exécuter dans Supabase SQL Editor sur la base cible.

-- 1. Vérifie que les tables sensibles ont bien RLS activée.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'merchants', 'merchant_users', 'campaigns', 'campaign_actions',
    'campaign_events', 'prizes', 'leads', 'draw_sessions',
    'reward_email_deliveries', 'reward_email_events', 'business_logs',
    'background_library_images', 'public_rate_limits',
    'daily_participation_locks', 'cashier_redemption_audits'
  ]::text[])
order by c.relname;

-- 2. Liste les policies présentes sur les tables sensibles.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = any (array[
    'merchants', 'merchant_users', 'campaigns', 'campaign_actions',
    'campaign_events', 'prizes', 'leads', 'draw_sessions',
    'reward_email_deliveries', 'reward_email_events', 'business_logs',
    'background_library_images', 'public_rate_limits',
    'daily_participation_locks', 'cashier_redemption_audits'
  ]::text[])
order by tablename, policyname;

-- 3. Vérifie les fonctions critiques, leur signature et SECURITY DEFINER.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = any (array[
    'consume_public_rate_limit',
    'claim_daily_participation_lock',
    'release_daily_participation_lock',
    'create_draw_session',
    'finalize_draw_session_and_create_lead',
    'draw_campaign_prize_and_create_lead',
    'redeem_cashier_lead_prize'
  ]::name[])
order by p.proname, arguments;

-- 4. Vérifie les index ajoutés pour les recherches de retrait et d'alertes e-mail.
with expected(indexname) as (
  values
    ('reward_email_deliveries_campaign_status_idx'::name),
    ('leads_campaign_status_prize_idx'::name),
    ('leads_redemption_code_lower_idx'::name)
)
select
  expected.indexname,
  indexes.schemaname,
  indexes.tablename,
  indexes.indexdef,
  (indexes.indexname is not null) as present
from expected
left join pg_indexes indexes
  on indexes.schemaname = 'public'
 and indexes.indexname = expected.indexname
order by expected.indexname;
