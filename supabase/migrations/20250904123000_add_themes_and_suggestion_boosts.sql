-- Themes entitlements
create table if not exists public.user_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme_id text not null,
  granted_at timestamptz not null default now(),
  unique(user_id, theme_id)
);

alter table public.user_themes enable row level security;
create policy "Users can view their themes" on public.user_themes for select using (auth.uid() = user_id);
create policy "Users can manage their themes" on public.user_themes for insert with check (auth.uid() = user_id);

-- Suggestion boosts
create table if not exists public.suggestion_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_text text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.suggestion_boosts enable row level security;
create policy "Users can view own boosts" on public.suggestion_boosts for select using (auth.uid() = user_id);
create policy "Users can create boosts" on public.suggestion_boosts for insert with check (auth.uid() = user_id);


