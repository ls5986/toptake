-- Create prompt suggestions table
create table if not exists public.prompt_suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  original_text text not null,
  ai_fixed_text text,
  status text default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  scheduled_date date,
  admin_edited_text text,
  ai_improvement_notes text,
  submitted_version text default 'original' not null,
  credit_awarded boolean default false not null,
  credit_amount integer default 0 not null,
  credit_awarded_at timestamp with time zone,
  credit_awarded_by uuid references auth.users(id),
  credit_award_reason text,
  version_history jsonb default '[]'::jsonb not null,
  engagement_score integer,
  safety_score integer,
  ai_moderated boolean default false not null,
  ai_moderation_notes text,
  duplicate_check_hash text,
  inappropriate_content_check boolean default false not null,
  inappropriate_content_reason text,
  collaboration_notes text,
  feedback_notes text,
  feedback_given_at timestamp with time zone,
  feedback_given_by uuid references auth.users(id),
  scheduled_for timestamp with time zone,
  scheduled_by uuid references auth.users(id),
  scheduled_reason text,
  activation_status text default 'pending' not null,
  activation_notes text,
  activation_date timestamp with time zone,
  activation_by uuid references auth.users(id),
  analytics_data jsonb default '{}'::jsonb not null
);

-- Add RLS policies
alter table public.prompt_suggestions enable row level security;

-- Users can view their own suggestions
create policy "Users can view their own suggestions"
  on public.prompt_suggestions for select
  using (auth.uid() = user_id);

-- Users can create suggestions
create policy "Users can create suggestions"
  on public.prompt_suggestions for insert
  with check (auth.uid() = user_id);

-- Users can update their own pending suggestions
create policy "Users can update their own pending suggestions"
  on public.prompt_suggestions for update
  using (auth.uid() = user_id and status = 'pending');

-- Admins can view all suggestions
create policy "Admins can view all suggestions"
  on public.prompt_suggestions for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  ));

-- Admins can update all suggestions
create policy "Admins can update all suggestions"
  on public.prompt_suggestions for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_admin = true
  ));

-- Create function to award credits
create or replace function award_prompt_suggestion_credits(
  suggestion_id uuid,
  amount integer,
  reason text,
  awarded_by uuid
) returns void as $$
begin
  -- Update suggestion
  update public.prompt_suggestions
  set 
    credit_awarded = true,
    credit_amount = amount,
    credit_awarded_at = now(),
    credit_awarded_by = awarded_by,
    credit_award_reason = reason
  where id = suggestion_id;

  -- Award credits to user
  insert into public.user_credits (
    user_id,
    credit_type,
    balance,
    created_at
  )
  select 
    user_id,
    'prompt_suggestion',
    amount,
    now()
  from public.prompt_suggestions
  where id = suggestion_id
  on conflict (user_id, credit_type)
  do update set
    balance = user_credits.balance + amount;

  -- Record credit history
  insert into public.credit_history (
    user_id,
    credit_type,
    amount,
    action,
    reason,
    created_at
  )
  select 
    user_id,
    'prompt_suggestion',
    amount,
    'award',
    reason,
    now()
  from public.prompt_suggestions
  where id = suggestion_id;
end;
$$ language plpgsql security definer;

-- Create function to check for duplicates
create or replace function check_duplicate_suggestion(
  suggestion_text text
) returns boolean as $$
begin
  return exists (
    select 1
    from public.prompt_suggestions
    where 
      (original_text = suggestion_text or ai_fixed_text = suggestion_text)
      and status != 'rejected'
      and created_at > now() - interval '30 days'
  );
end;
$$ language plpgsql security definer;

-- Create function to record version history
create or replace function record_suggestion_version(
  suggestion_id uuid,
  new_text text,
  edited_by uuid,
  edit_reason text
) returns void as $$
begin
  update public.prompt_suggestions
  set 
    version_history = version_history || jsonb_build_object(
      'text', new_text,
      'edited_by', edited_by,
      'edit_reason', edit_reason,
      'edited_at', now()
    )
  where id = suggestion_id;
end;
$$ language plpgsql security definer; 