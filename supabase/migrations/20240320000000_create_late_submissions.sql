create table if not exists public.user_late_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt_date date not null,
  payment_id text not null,
  amount_paid decimal(10,2) not null,
  status text not null check (status in ('pending', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one late submission per user per prompt date
  unique(user_id, prompt_date)
);

-- Add RLS policies
alter table public.user_late_submissions enable row level security;

create policy "Users can view their own late submissions"
  on public.user_late_submissions for select
  using (auth.uid() = user_id);

create policy "Users can create their own late submissions"
  on public.user_late_submissions for insert
  with check (auth.uid() = user_id);

-- Create function to check if user has paid for late submission
create or replace function public.has_paid_late_submission(user_id uuid, prompt_date date)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_late_submissions
    where user_id = $1
    and prompt_date = $2
    and status = 'completed'
  );
end;
$$ language plpgsql security definer; 