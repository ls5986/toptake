-- Set all existing profiles to public by default
update public.profiles set is_private = false where is_private is null or is_private = true;

-- Ensure default is public for new rows
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_private') then
    alter table public.profiles alter column is_private set default false;
  end if;
end$$;

