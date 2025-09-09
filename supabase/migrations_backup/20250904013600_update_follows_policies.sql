-- Align follows RLS policies with existing schema (user_id/target_user_id)
alter table public.follows enable row level security;

drop policy if exists "Users can manage their follows" on public.follows;
create policy "Users can manage their follows"
  on public.follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


