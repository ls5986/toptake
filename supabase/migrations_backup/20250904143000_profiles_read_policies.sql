-- Ensure profiles are readable to authenticated users (and anon for shareable routes)
do $$ begin
  begin
    alter table public.profiles enable row level security;
  exception when others then null; end;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles readable to authenticated'
  ) then
    create policy "Profiles readable to authenticated" on public.profiles for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles readable to anon'
  ) then
    create policy "Profiles readable to anon" on public.profiles for select to anon using (true);
  end if;
end $$;


