-- Allow users to list their own blocked users
create policy if not exists "Users can view their blocks"
  on public.blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

