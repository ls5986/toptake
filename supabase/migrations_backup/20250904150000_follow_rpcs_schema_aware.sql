-- Make follow/unfollow RPCs resilient to schema variants
-- Variants observed: (follower_id, followee_id) or (follower_id, followed_id) or legacy (user_id, target_user_id)

create or replace function follow_user(p_viewer uuid, p_target uuid)
returns void
language plpgsql
security definer
as $$
declare
  has_followee boolean := false;
  has_followed boolean := false;
  has_legacy boolean := false;
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then
    return;
  end if;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'followee_id'
  ) into has_followee;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'followed_id'
  ) into has_followed;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'user_id'
  ) into has_legacy;

  if has_followee then
    insert into public.follows (follower_id, followee_id)
    values (p_viewer, p_target)
    on conflict do nothing;
  elsif has_followed then
    insert into public.follows (follower_id, followed_id)
    values (p_viewer, p_target)
    on conflict do nothing;
  elsif has_legacy then
    insert into public.follows (user_id, target_user_id)
    values (p_viewer, p_target)
    on conflict do nothing;
  else
    raise exception 'follows table has unexpected schema';
  end if;
end;
$$;

create or replace function unfollow_user(p_viewer uuid, p_target uuid)
returns void
language plpgsql
security definer
as $$
declare
  has_followee boolean := false;
  has_followed boolean := false;
  has_legacy boolean := false;
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then
    return;
  end if;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'followee_id'
  ) into has_followee;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'followed_id'
  ) into has_followed;

  select exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'follows' and column_name = 'user_id'
  ) into has_legacy;

  if has_followee then
    delete from public.follows where follower_id = p_viewer and followee_id = p_target;
  elsif has_followed then
    delete from public.follows where follower_id = p_viewer and followed_id = p_target;
  elsif has_legacy then
    delete from public.follows where user_id = p_viewer and target_user_id = p_target;
  else
    raise exception 'follows table has unexpected schema';
  end if;
end;
$$;


