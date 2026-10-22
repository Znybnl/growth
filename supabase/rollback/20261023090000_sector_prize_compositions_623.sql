-- #623 rollback: remove only rows inserted by this migration and still untouched.
-- Saved campaign prizes are independent and are never modified.
-- Apply after application rollback; no CASCADE or change to RLS.
begin;
delete from public.prize_suggestions s
using public.prize_catalog_623_inserted b
where s.id = b.id and to_jsonb(s) = b.row_data;
-- Keep the private manifest: edited standard suggestions remain intact.
commit;
