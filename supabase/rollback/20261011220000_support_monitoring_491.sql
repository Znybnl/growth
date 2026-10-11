-- Roll back the application first; no business data is deleted.
drop function if exists public.get_support_monitoring(text,text,text,timestamptz,timestamptz,text,text,integer,integer);
