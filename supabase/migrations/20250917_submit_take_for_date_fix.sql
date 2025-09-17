-- Corrected RPC: ensure parameters after a default also have defaults
create or replace function public.submit_take_for_date(
  p_user_id uuid,
  p_content text,
  p_is_anonymous boolean default false,
  p_date date default null,
  p_is_late boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_prompt_id uuid;
  v_take_id uuid;
  v_date date;
begin
  v_date := coalesce(p_date, current_date);

  -- Find the prompt scheduled for the provided date
  select id into v_prompt_id
  from public.daily_prompts
  where prompt_date = v_date
    and is_active = true
  limit 1;

  if v_prompt_id is null then
    raise exception 'No prompt found for date %', v_date using errcode = 'P0002';
  end if;

  -- Insert the take; enforce one take per user per date
  insert into public.takes (user_id, content, is_anonymous, prompt_id, prompt_date, is_late_submit)
  values (p_user_id, trim(p_content), coalesce(p_is_anonymous, false), v_prompt_id, v_date, coalesce(p_is_late, false))
  on conflict (user_id, prompt_date) do nothing
  returning id into v_take_id;

  -- If already exists, return the existing id
  if v_take_id is null then
    select id into v_take_id from public.takes where user_id = p_user_id and prompt_date = v_date;
  end if;

  return v_take_id;
end;
$$;
