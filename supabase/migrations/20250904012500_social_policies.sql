-- Recreate RLS policies for follows/blocks without IF NOT EXISTS
drop policy if exists "Users can manage their follows" on public.follows;
create policy "Users can manage their follows"
  on public.follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their blocks" on public.blocks;
create policy "Users can manage their blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);


