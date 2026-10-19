-- Roll the application back first. No records are modified by this rollback.
begin;
drop function if exists public.get_merchant_operational_alerts(text);
drop function if exists public.get_merchant_page_overview(text);
commit;
