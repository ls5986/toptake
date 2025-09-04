-- Idempotent reconciliation for production schema differences

-- 1) Ensure follows has correct columns and constraints
do $$
begin
  -- Rename followed_id -> followee_id if needed
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followee_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followed_id'
  ) then
    alter table public.follows rename column followed_id to followee_id;
  end if;

  -- Add columns if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='follower_id'
  ) then
    alter table public.follows add column follower_id uuid;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followee_id'
  ) then
    alter table public.follows add column followee_id uuid;
  end if;

  -- Foreign keys if missing
  if not exists (
    select 1 from information_schema.constraint_column_usage c
    where c.table_schema='public' and c.table_name='follows' and c.constraint_name='follows_follower_fkey'
  ) then
    alter table public.follows add constraint follows_follower_fkey foreign key (follower_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (
    select 1 from information_schema.constraint_column_usage c
    where c.table_schema='public' and c.table_name='follows' and c.constraint_name='follows_followee_fkey'
  ) then
    alter table public.follows add constraint follows_followee_fkey foreign key (followee_id) references public.profiles(id) on delete cascade;
  end if;

  -- Unique constraint
  if not exists (
    select 1 from pg_constraint where conname='follows_unique'
  ) then
    alter table public.follows add constraint follows_unique unique (follower_id, followee_id);
  end if;
end$$;

-- 2) Policies using standards-compliant DO blocks

-- follows: insert policy
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Users can follow'
  ) then
    create policy "Users can follow" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
  end if;
end$$;

-- follows: public select (authenticated)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Anyone can view follows'
  ) then
    create policy "Anyone can view follows" on public.follows for select to authenticated using (true);
  end if;
end$$;

-- follows: anon select for share links
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='follows' and policyname='Anon can view follows'
  ) then
    create policy "Anon can view follows" on public.follows for select to anon using (true);
  end if;
end$$;

-- blocks: allow users to view their own blocks
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='blocks' and policyname='Users can view their blocks'
  ) then
    create policy "Users can view their blocks" on public.blocks for select to authenticated using (auth.uid() = blocker_id);
  end if;
end$$;

-- event_logs table policies if table exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='event_logs') then
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='event_logs' and policyname='Authenticated can insert logs'
    ) then
      create policy "Authenticated can insert logs" on public.event_logs for insert to authenticated with check (true);
    end if;
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='event_logs' and policyname='Users can view own logs'
    ) then
      create policy "Users can view own logs" on public.event_logs for select to authenticated using (auth.uid() = user_id);
    end if;
  end if;
end$$;

-- 3) Guard daily_prompts.engagement_score
alter table if exists public.daily_prompts add column if not exists engagement_score integer default 0;


