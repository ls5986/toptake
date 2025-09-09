create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.event_logs enable row level security;
create policy if not exists "Authenticated can insert logs"
  on public.event_logs for insert to authenticated with check (true);
create policy if not exists "Users can view own logs"
  on public.event_logs for select to authenticated using (auth.uid() = user_id);

