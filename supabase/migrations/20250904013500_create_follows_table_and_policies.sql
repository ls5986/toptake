-- Create follows table and RLS policies (clean)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, followed_id)
);

alter table public.follows enable row level security;

drop policy if exists "Users can manage their follows" on public.follows;
create policy "Users can manage their follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);


