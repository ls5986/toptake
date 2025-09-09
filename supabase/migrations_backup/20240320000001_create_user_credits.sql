create table if not exists public.user_credits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  anonymous integer default 0,
  late_submit integer default 0,
  sneak_peek integer default 0,
  boost integer default 0,
  extra_takes integer default 0,
  delete_credits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one credit record per user
  unique(user_id)
);

-- Add RLS policies
alter table public.user_credits enable row level security;

create policy "Users can view their own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

create policy "Users can update their own credits"
  on public.user_credits for update
  using (auth.uid() = user_id);

create policy "Users can insert their own credits"
  on public.user_credits for insert
  with check (auth.uid() = user_id);

-- Create function to get user credits
create or replace function public.get_user_credits(user_id uuid)
returns json as $$
begin
  return (
    select json_build_object(
      'anonymous', coalesce(anonymous, 0),
      'late_submit', coalesce(late_submit, 0),
      'sneak_peek', coalesce(sneak_peek, 0),
      'boost', coalesce(boost, 0),
      'extra_takes', coalesce(extra_takes, 0),
      'delete', coalesce(delete_credits, 0)
    )
    from public.user_credits
    where user_id = $1
  );
end;
$$ language plpgsql security definer; 