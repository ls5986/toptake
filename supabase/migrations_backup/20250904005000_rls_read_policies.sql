-- Ensure authenticated users can read public content
do $$ begin
  -- takes select
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='takes' and policyname='Enable read access for authenticated users'
  ) then
    create policy "Enable read access for authenticated users" on public.takes for select to authenticated using (true);
  end if;
  -- comments select
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='Enable read access for authenticated users'
  ) then
    create policy "Enable read access for authenticated users" on public.comments for select to authenticated using (true);
  end if;
end $$;


