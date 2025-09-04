-- Notify followed user on new follow
create or replace function public.notify_on_follow()
returns trigger as $$
begin
  insert into public.notifications(user_id, type, message, actor_id, created_at, read)
  values (NEW.target_user_id, 'follow', 'You have a new follower', auth.uid(), now(), false);
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
after insert on public.follows
for each row execute function public.notify_on_follow();


