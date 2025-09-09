-- RLS policies for sneak_peeks
create policy "Users can view their own sneak peeks"
  on public.sneak_peeks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sneak peeks"
  on public.sneak_peeks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own sneak peeks"
  on public.sneak_peeks for delete
  using (auth.uid() = user_id);


