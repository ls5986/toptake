-- Create blocks table and RLS policies (clean version)
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "Users can manage their blocks" on public.blocks;
create policy "Users can manage their blocks"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);


