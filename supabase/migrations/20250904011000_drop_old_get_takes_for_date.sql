-- Remove overloaded versions to avoid PostgREST ambiguity (PGRST203)
drop function if exists public.get_takes_for_date(date);
drop function if exists public.get_takes_for_date(date, integer);


