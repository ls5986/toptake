-- Helpers to abstract legacy vs normalized follows columns
create or replace function public.get_follow_stats(p_viewer uuid, p_target uuid)
returns table(followers_count int, following_count int, is_following boolean)
language plpgsql as $$
declare has_followee boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followee_id'
  ) into has_followee;

  if has_followee then
    select count(*) into followers_count from public.follows where followee_id = p_target;
    select count(*) into following_count from public.follows where follower_id = p_target;
    if p_viewer is null then is_following := false; else
      select exists(select 1 from public.follows where follower_id = p_viewer and followee_id = p_target) into is_following;
    end if;
  else
    -- legacy column followed_id
    select count(*) into followers_count from public.follows where followed_id = p_target;
    select count(*) into following_count from public.follows where follower_id = p_target;
    if p_viewer is null then is_following := false; else
      select exists(select 1 from public.follows where follower_id = p_viewer and followed_id = p_target) into is_following;
    end if;
  end if;
  return next;
end$$;

create or replace function public.follow_user(p_viewer uuid, p_target uuid)
returns void language plpgsql as $$
declare has_followee boolean;
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then
    return;
  end if;
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followee_id'
  ) into has_followee;
  if has_followee then
    insert into public.follows(follower_id, followee_id) values (p_viewer, p_target)
    on conflict do nothing;
  else
    insert into public.follows(follower_id, followed_id) values (p_viewer, p_target)
    on conflict do nothing;
  end if;
end$$;

create or replace function public.unfollow_user(p_viewer uuid, p_target uuid)
returns void language plpgsql as $$
declare has_followee boolean;
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then
    return;
  end if;
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='followee_id'
  ) into has_followee;
  if has_followee then
    delete from public.follows where follower_id = p_viewer and followee_id = p_target;
  else
    delete from public.follows where follower_id = p_viewer and followed_id = p_target;
  end if;
end$$;


