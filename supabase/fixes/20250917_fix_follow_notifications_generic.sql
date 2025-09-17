-- Robust follow notification trigger: avoid direct NEW.column references
-- Uses to_jsonb(NEW)->>'col' to support varying follows schemas

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
as $$
declare
  v_actor uuid;
  v_target uuid;
  v_username text;
begin
  -- Extract actor (follower)
  v_actor := coalesce(
    (to_jsonb(NEW)->>'follower_id')::uuid,
    (to_jsonb(NEW)->>'user_id')::uuid
  );

  -- Extract target (followed)
  v_target := coalesce(
    (to_jsonb(NEW)->>'followee_id')::uuid,
    (to_jsonb(NEW)->>'followed_id')::uuid,
    (to_jsonb(NEW)->>'target_user_id')::uuid
  );

  if v_actor is null or v_target is null or v_actor = v_target then
    return NEW;
  end if;

  select username into v_username from public.profiles where id = v_actor limit 1;

  insert into public.notifications(user_id, type, actor_id, title, message)
  values (
    v_target,
    'follow',
    v_actor,
    'New follower',
    coalesce(v_username, 'Someone') || ' followed you'
  );

  return NEW;
end;
$$;

-- Ensure trigger uses the updated function
drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
after insert on public.follows
for each row execute function public.notify_on_follow();


