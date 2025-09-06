-- Safety trigger to populate legacy NOT NULL columns on follows
create or replace function public.set_follows_legacy_cols()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Ensure user_id is set when legacy column exists and is non-nullable
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='user_id') then
    if coalesce((select is_nullable='NO' from information_schema.columns
                 where table_schema='public' and table_name='follows' and column_name='user_id' limit 1), false) then
      if new.user_id is null then new.user_id := auth.uid(); end if;
    end if;
  end if;

  -- Ensure target_user_id mirrors followee/followed when legacy column exists and is non-nullable
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follows' and column_name='target_user_id') then
    if coalesce((select is_nullable='NO' from information_schema.columns
                 where table_schema='public' and table_name='follows' and column_name='target_user_id' limit 1), false) then
      if new.target_user_id is null then
        new.target_user_id := coalesce(new.followee_id, new.followed_id);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_follows_legacy_cols on public.follows;
create trigger trg_set_follows_legacy_cols
before insert on public.follows
for each row execute function public.set_follows_legacy_cols();

-- Robust RPCs that write both modern and legacy columns when present
create or replace function public.follow_user(p_viewer uuid, p_target uuid)
returns void
language plpgsql
security definer
as $$
declare
  has_followee boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='followee_id');
  has_followed boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='followed_id');
  has_legacy  boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='user_id');
  legacy_nn   boolean := coalesce((select is_nullable='NO' from information_schema.columns where table_schema='public' and table_name='follows' and column_name='user_id' limit 1), false);
  has_legacy_target boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='target_user_id');
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then return; end if;

  if has_followee then
    if legacy_nn and has_legacy_target then
      insert into public.follows (follower_id, followee_id, user_id, target_user_id)
      values (p_viewer, p_target, p_viewer, p_target)
      on conflict do nothing;
    else
      insert into public.follows (follower_id, followee_id)
      values (p_viewer, p_target)
      on conflict do nothing;
    end if;
  elsif has_followed then
    if legacy_nn and has_legacy_target then
      insert into public.follows (follower_id, followed_id, user_id, target_user_id)
      values (p_viewer, p_target, p_viewer, p_target)
      on conflict do nothing;
    else
      insert into public.follows (follower_id, followed_id)
      values (p_viewer, p_target)
      on conflict do nothing;
    end if;
  elsif has_legacy then
    insert into public.follows (user_id, target_user_id)
    values (p_viewer, p_target)
    on conflict do nothing;
  else
    raise exception 'follows table has unexpected schema';
  end if;
end;
$$;

create or replace function public.unfollow_user(p_viewer uuid, p_target uuid)
returns void
language plpgsql
security definer
as $$
declare
  has_followee boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='followee_id');
  has_followed boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='followed_id');
  has_legacy  boolean := exists (select 1 from information_schema.columns where table_schema='public' and table_name='follows' and column_name='user_id');
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then return; end if;

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


