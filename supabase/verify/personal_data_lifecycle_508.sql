-- Read-only review: never execute the lifecycle RPC to inspect its presence.
-- Run in the authorized project's SQL editor. No row/person/secret is returned.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
  has_table_privilege('service_role', c.oid, 'SELECT') as service_can_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('archived_leads', 'archived_campaign_events', 'archived_cashier_redemption_audits')
order by c.relname;

select p.proname as function_name, p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_can_execute,
  pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'purge_personal_data'
  and pg_get_function_identity_arguments(p.oid) = '';
