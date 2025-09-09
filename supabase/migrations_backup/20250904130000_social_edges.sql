-- Follows (Instagram-like)
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, followee_id)
);
alter table public.follows enable row level security;
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can view follows" on public.follows for select using (auth.uid() = follower_id or auth.uid() = followee_id);

-- Blocks
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "Users can block" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "Users can view blocks" on public.blocks for select using (auth.uid() = blocker_id);

