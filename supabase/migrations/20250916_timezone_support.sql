-- Add timezone column to profiles (IANA timezone like 'America/Los_Angeles')
alter table if exists public.profiles
  add column if not exists timezone text;

-- Compute a user's local date from a timestamp
create or replace function public.compute_user_local_date(p_user_id uuid, p_ts timestamptz default now())
returns date
language plpgsql
stable
as $$
declare
  tz text;
  off integer;
begin
  select timezone into tz from public.profiles where id = p_user_id;
  if tz is not null and tz <> '' then
    return (p_ts at time zone tz)::date;
  end if;

  select timezone_offset into off from public.profiles where id = p_user_id;
  return (p_ts + make_interval(mins => coalesce(off, 0)))::date;
end;
$$;

-- Submit take using user's local date
create or replace function public.submit_take(
  p_user_id uuid,
  p_content text,
  p_is_anonymous boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_prompt_id uuid;
  v_take_id uuid;
  v_local_date date;
begin
  v_local_date := public.compute_user_local_date(p_user_id, now());

  select id into v_prompt_id
  from public.daily_prompts
  where prompt_date = v_local_date and is_active = true
  limit 1;

  if v_prompt_id is null then
    raise exception 'No prompt found for local date %', v_local_date using errcode = 'P0002';
  end if;

  insert into public.takes (user_id, content, is_anonymous, prompt_id, prompt_date)
  values (p_user_id, trim(p_content), coalesce(p_is_anonymous, false), v_prompt_id, v_local_date)
  on conflict (user_id, prompt_date) do nothing
  returning id into v_take_id;

  if v_take_id is null then
    select id into v_take_id from public.takes where user_id = p_user_id and prompt_date = v_local_date;
  end if;

  return v_take_id;
end;
$$;

-- has_posted_today using user local date
create or replace function public.has_posted_today(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.takes
    where user_id = p_user_id
      and prompt_date = public.compute_user_local_date(p_user_id, now())
  );
$$;
