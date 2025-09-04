-- Submit a take atomically for a given date; enforces one-per-day and attaches prompt_id
create or replace function public.submit_take(
  p_user_id uuid,
  p_content text,
  p_is_anonymous boolean default false,
  p_date date default current_date
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_prompt_id uuid;
  v_take_id uuid;
begin
  -- find prompt for the date
  select id into v_prompt_id from public.daily_prompts
  where prompt_date = p_date and is_active = true
  limit 1;
  if v_prompt_id is null then
    raise exception 'No prompt found for date %', p_date using errcode = 'P0002';
  end if;

  -- insert take; respect uniqueness (user_id, prompt_date)
  insert into public.takes (user_id, content, is_anonymous, prompt_id, prompt_date)
  values (p_user_id, trim(p_content), coalesce(p_is_anonymous, false), v_prompt_id, p_date)
  on conflict (user_id, prompt_date) do nothing
  returning id into v_take_id;

  -- if already exists, return the existing id
  if v_take_id is null then
    select id into v_take_id from public.takes where user_id = p_user_id and prompt_date = p_date;
  end if;

  return v_take_id;
end;
$$;


