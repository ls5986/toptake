create table if not exists public.takes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  is_anonymous boolean default false not null,
  is_late_submit boolean default false not null,
  prompt_date date not null,
  daily_prompt_id uuid references public.daily_prompts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one take per user per prompt date
  unique(user_id, prompt_date)
);

-- Add RLS policies
alter table public.takes enable row level security;

create policy "Users can view their own takes"
  on public.takes for select
  using (auth.uid() = user_id);

create policy "Users can view non-anonymous takes"
  on public.takes for select
  using (not is_anonymous);

create policy "Users can create their own takes"
  on public.takes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own takes"
  on public.takes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own takes"
  on public.takes for delete
  using (auth.uid() = user_id); 