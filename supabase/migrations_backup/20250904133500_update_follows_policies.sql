-- Relax select policy to make follows public-readable (profiles are public-by-default)
drop policy if exists "Users can view follows" on public.follows;
create policy "Anyone can view follows"
  on public.follows for select
  to authenticated
  using (true);

-- Optionally allow anon too (for web sharing)
create policy if not exists "Anon can view follows"
  on public.follows for select
  to anon
  using (true);

