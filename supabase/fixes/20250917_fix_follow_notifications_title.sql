-- Fix follow notifications: provide required title and robust column mapping
-- Safe to run multiple times

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
as $$
declare
  v_username text;
  v_actor uuid;
  v_target uuid;
begin
  -- Determine actor (follower) and target (followed)
  v_actor := coalesce(NEW.follower_id, NEW.user_id);
  v_target := coalesce(NEW.followee_id, NEW.followed_id, NEW.target_user_id);

  select username into v_username from public.profiles where id = v_actor limit 1;

  -- Insert with required title (NOT NULL) and friendly message
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

-- Recreate trigger to ensure it points to the updated function
drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
after insert on public.follows
for each row execute function public.notify_on_follow();


