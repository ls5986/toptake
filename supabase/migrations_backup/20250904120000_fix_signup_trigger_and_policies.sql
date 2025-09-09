-- Fix signup: ensure profile row is created and policies permit access
-- Safe guards with IF EXISTS checks so migration is idempotent

-- Allow nullable username if previously NOT NULL
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username' and is_nullable = 'NO'
  ) then
    alter table public.profiles alter column username drop not null;
  end if;
exception when others then
  -- ignore if privileges don't allow, migration will still proceed
  null;
end $$;

-- Create/replace trigger function to insert profile for new auth user
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (id, username, current_streak, longest_streak, created_at)
  values (new.id, null, 0, 0, now())
  on conflict (id) do nothing;
  return new;
end
$$;

-- Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Ensure RLS enabled and policies exist for profiles
alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles select own'
  ) then
    create policy "Profiles select own" on public.profiles
      for select using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles update own'
  ) then
    create policy "Profiles update own" on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles insert self'
  ) then
    create policy "Profiles insert self" on public.profiles
      for insert with check (auth.uid() = id);
  end if;
end $$;



