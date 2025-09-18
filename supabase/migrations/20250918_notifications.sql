-- Notifications: device tokens and SMS opt-in

-- Add fields to profiles for SMS
alter table if exists public.profiles
  add column if not exists phone_e164 text,
  add column if not exists sms_opt_in boolean default false,
  add column if not exists sms_opt_in_at timestamptz;

-- Device tokens table
create table if not exists public.device_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, token)
);

alter table public.device_tokens enable row level security;

do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='device_tokens' and policyname='device_tokens_select_self') then
    drop policy "device_tokens_select_self" on public.device_tokens;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='device_tokens' and policyname='device_tokens_upsert_self') then
    drop policy "device_tokens_upsert_self" on public.device_tokens;
  end if;
end $$;

create policy "device_tokens_select_self" on public.device_tokens for select
using (user_id = auth.uid());

create policy "device_tokens_upsert_self" on public.device_tokens for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Simple trigger to update timestamp
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_device_tokens_touch on public.device_tokens;
create trigger trg_device_tokens_touch before update on public.device_tokens
for each row execute function public.touch_updated_at();


