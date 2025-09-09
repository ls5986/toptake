create or replace function public.get_takes_for_date(
  p_date date,
  p_limit integer default 30,
  p_before_created_at timestamptz default null
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  is_anonymous boolean,
  created_at timestamptz,
  prompt_date date,
  username text,
  comment_count integer,
  reaction_count integer
) language sql stable as $$
  with base as (
    select t.*
    from public.takes t
    where t.prompt_date = p_date
      and (p_before_created_at is null or t.created_at < p_before_created_at)
    order by t.created_at desc
    limit p_limit
  ),
  comments_agg as (
    select take_id, count(*)::int as cnt
    from public.comments
    where take_id in (select id from base)
    group by take_id
  ),
  reactions_agg as (
    select take_id, count(*)::int as cnt
    from public.take_reactions
    where take_id in (select id from base)
    group by take_id
  )
  select 
    b.id,
    b.user_id,
    b.content,
    b.is_anonymous,
    b.created_at,
    b.prompt_date,
    p.username,
    coalesce(ca.cnt, 0) as comment_count,
    coalesce(ra.cnt, 0) as reaction_count
  from base b
  left join public.profiles p on p.id = b.user_id
  left join comments_agg ca on ca.take_id = b.id
  left join reactions_agg ra on ra.take_id = b.id
  order by (coalesce(ca.cnt,0) + coalesce(ra.cnt,0)) desc, b.created_at desc
$$;


