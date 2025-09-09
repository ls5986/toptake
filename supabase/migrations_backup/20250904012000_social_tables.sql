-- Follows: who the viewer follows
create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(user_id, target_user_id)
);
alter table public.follows enable row level security;
create policy if not exists "Users can manage their follows"
  on public.follows for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Blocks: users the viewer blocks
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy if not exists "Users can manage their blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);


