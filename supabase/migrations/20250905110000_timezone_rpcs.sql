-- Helper: compute a user's local date from a timestamp using profiles.timezone_offset (minutes)
create or replace function public.compute_user_local_date(p_user_id uuid, p_ts timestamptz default now())
returns date
language sql
stable
as $$
  select (p_ts + make_interval(mins => coalesce((select timezone_offset from public.profiles where id = p_user_id), 0)))::date;
$$;

-- Update submit_take to use user's local date and ignore client-sent date
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

-- get_takes_for_date adjusted: if p_date is null, use user local today
create or replace function public.get_takes_for_date(p_user_id uuid, p_date date default null, p_before_created_at timestamptz default null)
returns setof public.takes
language plpgsql
stable
as $$
declare
  v_date date;
begin
  v_date := coalesce(p_date, public.compute_user_local_date(p_user_id, now()));
  return query
  select * from public.takes t
  where t.prompt_date = v_date
    and (p_before_created_at is null or t.created_at < p_before_created_at)
  order by t.created_at desc;
end;
$$;


