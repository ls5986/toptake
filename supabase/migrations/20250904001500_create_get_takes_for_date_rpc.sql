-- Returns takes with username and comment_count for a given prompt_date
create or replace function public.get_takes_for_date(p_date date)
returns table (
  id uuid,
  user_id uuid,
  content text,
  is_anonymous boolean,
  created_at timestamptz,
  prompt_date date,
  username text,
  comment_count integer
) language sql stable as $$
  select 
    t.id,
    t.user_id,
    t.content,
    t.is_anonymous,
    t.created_at,
    t.prompt_date,
    p.username,
    coalesce(c.cnt, 0)::integer as comment_count
  from public.takes t
  left join public.profiles p on p.id = t.user_id
  left join (
    select take_id, count(*) as cnt
    from public.comments
    group by take_id
  ) c on c.take_id = t.id
  where t.prompt_date = p_date
  order by t.created_at desc
$$;


