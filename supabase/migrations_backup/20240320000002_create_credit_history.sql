-- Credit purchases (create this first since credit_history references it)
create table if not exists public.credit_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  credit_type text not null check (credit_type in ('anonymous', 'late_submit', 'sneak_peek', 'boost', 'extra_takes', 'delete')),
  amount integer not null,
  price decimal(10,2) not null,
  stripe_payment_id text,
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone
);

-- Credit usage history (create this second since it references credit_purchases)
create table if not exists public.credit_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  credit_type text not null check (credit_type in ('anonymous', 'late_submit', 'sneak_peek', 'boost', 'extra_takes', 'delete')),
  amount integer not null,
  action text not null check (action in ('purchase', 'use', 'expire', 'refund')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  related_purchase_id uuid references public.credit_purchases(id)
);

-- Add RLS policies
alter table public.credit_history enable row level security;
alter table public.credit_purchases enable row level security;

-- Credit history policies
create policy "Users can view their own credit history"
  on public.credit_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credit history"
  on public.credit_history for insert
  with check (auth.uid() = user_id);

-- Credit purchases policies
create policy "Users can view their own credit purchases"
  on public.credit_purchases for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credit purchases"
  on public.credit_purchases for insert
  with check (auth.uid() = user_id);

-- Functions for credit management
create or replace function public.add_credit_history(
  p_user_id uuid,
  p_credit_type text,
  p_amount integer,
  p_action text,
  p_description text default null,
  p_expires_at timestamp with time zone default null,
  p_related_purchase_id uuid default null
) returns uuid as $$
declare
  v_history_id uuid;
begin
  insert into public.credit_history (
    user_id,
    credit_type,
    amount,
    action,
    description,
    expires_at,
    related_purchase_id
  ) values (
    p_user_id,
    p_credit_type,
    p_amount,
    p_action,
    p_description,
    p_expires_at,
    p_related_purchase_id
  ) returning id into v_history_id;
  
  return v_history_id;
end;
$$ language plpgsql security definer;

-- Function to get credit history
create or replace function public.get_credit_history(
  p_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
) returns table (
  id uuid,
  credit_type text,
  amount integer,
  action text,
  description text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
) as $$
begin
  return query
  select
    ch.id,
    ch.credit_type,
    ch.amount,
    ch.action,
    ch.description,
    ch.created_at,
    ch.expires_at
  from public.credit_history ch
  where ch.user_id = p_user_id
  order by ch.created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql security definer;

-- Function to check expired credits
create or replace function public.check_expired_credits()
returns void as $$
begin
  -- Update user credits by removing expired credits
  update public.user_credits uc
  set
    anonymous = greatest(0, anonymous - (
      select coalesce(sum(amount), 0)
      from public.credit_history
      where user_id = uc.user_id
      and credit_type = 'anonymous'
      and action = 'expire'
      and created_at > uc.updated_at
    )),
    late_submit = greatest(0, late_submit - (
      select coalesce(sum(amount), 0)
      from public.credit_history
      where user_id = uc.user_id
      and credit_type = 'late_submit'
      and action = 'expire'
      and created_at > uc.updated_at
    )),
    -- Repeat for other credit types
    updated_at = now()
  where exists (
    select 1
    from public.credit_history
    where user_id = uc.user_id
    and action = 'expire'
    and created_at > uc.updated_at
  );
end;
$$ language plpgsql security definer; 