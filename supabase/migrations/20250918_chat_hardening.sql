-- Chat hardening: indexes, constraints, and efficient RPCs

-- Indexes
create index if not exists idx_chat_messages_thread_created on public.chat_messages(thread_id, created_at);
create index if not exists idx_chat_messages_sender on public.chat_messages(sender_id);
create unique index if not exists ux_chat_participants_thread_user on public.chat_participants(thread_id, user_id);
create index if not exists idx_chat_participants_user on public.chat_participants(user_id);
create index if not exists idx_group_prompts_thread_date on public.group_prompts(thread_id, prompt_date);

-- mark_thread_read RPC (idempotent)
create or replace function public.mark_thread_read(p_thread uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_participants
  set last_read_at = greatest(coalesce(last_read_at, 'epoch'::timestamptz), now())
  where thread_id = p_thread and user_id = auth.uid();
end;
$$;

-- Efficient thread overview for a user
create or replace function public.list_threads_for_user(p_user uuid)
returns table (
  id uuid,
  is_group boolean,
  name text,
  privacy text,
  frequency text,
  created_at timestamptz,
  last_snippet text,
  unread integer
)
language sql
security definer
set search_path = public
as $$
  with my_threads as (
    select t.* , p.last_read_at
    from public.chat_threads t
    join public.chat_participants p on p.thread_id = t.id
    where p.user_id = p_user
  )
  select
    mt.id,
    mt.is_group,
    mt.name,
    mt.privacy,
    mt.frequency,
    mt.created_at,
    (select m.content from public.chat_messages m where m.thread_id = mt.id order by m.created_at desc limit 1) as last_snippet,
    coalesce((select count(*)::int from public.chat_messages m where m.thread_id = mt.id and m.created_at > coalesce(mt.last_read_at, 'epoch') and m.sender_id <> p_user), 0) as unread
  from my_threads mt
  order by mt.created_at desc;
$$;


