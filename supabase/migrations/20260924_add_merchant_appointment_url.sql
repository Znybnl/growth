alter table public.merchants
  add column if not exists appointment_url text;

-- Rollback strategy: revert the application code and keep this nullable column so saved links are not lost.
-- Drop the column only after confirming it contains no values that need to be retained.
