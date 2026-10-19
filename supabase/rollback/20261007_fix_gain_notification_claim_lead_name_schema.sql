-- Intentionally retain the compatibility fix on rollback: restoring the prior
-- function would reintroduce the confirmed production failure (42703).
begin;
commit;
