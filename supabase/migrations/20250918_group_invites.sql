-- Group Invites: table, RLS, and RPCs
-- Safe re-run guards

create table if not exists public.group_invites (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.group_invites enable row level security;

-- Drop existing policies idempotently
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='group_invites' and policyname='invites_select_self_or_inviter') then
    drop policy "invites_select_self_or_inviter" on public.group_invites;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='group_invites' and policyname='invites_insert_by_moderator') then
    drop policy "invites_insert_by_moderator" on public.group_invites;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='group_invites' and policyname='invites_update_status_self') then
    drop policy "invites_update_status_self" on public.group_invites;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='group_invites' and policyname='invites_delete_by_moderator') then
    drop policy "invites_delete_by_moderator" on public.group_invites;
  end if;
end $$;

-- Select: inviter or invitee can see
create policy "invites_select_self_or_inviter" on public.group_invites
for select
using (
  invited_user_id = auth.uid() or invited_by = auth.uid()
);

-- Insert: only thread moderators can invite
create policy "invites_insert_by_moderator" on public.group_invites
for insert to authenticated
with check (
  exists (
    select 1 from public.chat_participants p
    where p.thread_id = thread_id and p.user_id = auth.uid() and coalesce(p.role,'member') in ('moderator','owner')
  )
);

-- Update: invitee can change status; moderators can cancel
create policy "invites_update_status_self" on public.group_invites
for update to authenticated
using (
  invited_user_id = auth.uid() or exists (
    select 1 from public.chat_participants p
    where p.thread_id = group_invites.thread_id and p.user_id = auth.uid() and coalesce(p.role,'member') in ('moderator','owner')
  )
)
with check (true);

-- Delete: moderators only
create policy "invites_delete_by_moderator" on public.group_invites
for delete to authenticated
using (
  exists (
    select 1 from public.chat_participants p
    where p.thread_id = group_invites.thread_id and p.user_id = auth.uid() and coalesce(p.role,'member') in ('moderator','owner')
  )
);

-- RPCs

-- Invite by username
create or replace function public.invite_user_to_group(p_thread uuid, p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_invite uuid;
begin
  select id into v_user from public.profiles where lower(username)=lower(p_username) limit 1;
  if v_user is null then
    raise exception 'User not found';
  end if;
  -- Ensure caller is moderator
  if not exists (
    select 1 from public.chat_participants p where p.thread_id = p_thread and p.user_id = auth.uid() and coalesce(p.role,'member') in ('moderator','owner')
  ) then
    raise exception 'Not authorized';
  end if;
  insert into public.group_invites(thread_id, invited_user_id, invited_by, status)
  values (p_thread, v_user, auth.uid(), 'pending')
  returning id into v_invite;
  return v_invite;
end;
$$;

-- Accept invite
create or replace function public.accept_group_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread uuid;
  v_user uuid;
begin
  select thread_id, invited_user_id into v_thread, v_user from public.group_invites where id = p_invite and status='pending';
  if v_thread is null then
    raise exception 'Invite not found';
  end if;
  if v_user <> auth.uid() then
    raise exception 'Not your invite';
  end if;
  -- Add participant if not exists
  insert into public.chat_participants(thread_id, user_id, role)
  values (v_thread, v_user, 'member')
  on conflict (thread_id, user_id) do nothing;
  -- Mark invite accepted
  update public.group_invites set status='accepted' where id = p_invite;
end;
$$;

-- Decline invite
create or replace function public.decline_group_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select invited_user_id into v_user from public.group_invites where id = p_invite and status='pending';
  if v_user is null then
    raise exception 'Invite not found';
  end if;
  if v_user <> auth.uid() then
    raise exception 'Not your invite';
  end if;
  update public.group_invites set status='declined' where id = p_invite;
end;
$$;

-- Cancel invite (moderator)
create or replace function public.cancel_group_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread uuid;
begin
  select thread_id into v_thread from public.group_invites where id = p_invite and status='pending';
  if v_thread is null then
    return;
  end if;
  if not exists (
    select 1 from public.chat_participants p where p.thread_id = v_thread and p.user_id = auth.uid() and coalesce(p.role,'member') in ('moderator','owner')
  ) then
    raise exception 'Not authorized';
  end if;
  delete from public.group_invites where id = p_invite;
end;
$$;


