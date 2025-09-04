-- Create sneak_peeks table for unlocking future takes
create table if not exists public.sneak_peeks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  take_id uuid not null references public.takes(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, take_id)
);

-- Indexes
create index if not exists idx_sneak_peeks_user_id on public.sneak_peeks(user_id);
create index if not exists idx_sneak_peeks_take_id on public.sneak_peeks(take_id);

-- RLS policies
alter table public.sneak_peeks enable row level security;

create policy if not exists "Users can view their own sneak peeks"
  on public.sneak_peeks for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own sneak peeks"
  on public.sneak_peeks for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete their own sneak peeks"
  on public.sneak_peeks for delete
  using (auth.uid() = user_id);


