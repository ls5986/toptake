-- Toggle a like/dislike vote for a comment; pass null to remove
create or replace function public.comment_vote_toggle(
  p_comment_id uuid,
  p_user_id uuid,
  p_vote_type text
)
returns void
language plpgsql
security definer
as $$
begin
  if p_vote_type is null then
    delete from public.comment_votes where comment_id = p_comment_id and user_id = p_user_id;
    return;
  end if;
  -- upsert vote
  insert into public.comment_votes (comment_id, user_id, vote_type, created_at)
  values (p_comment_id, p_user_id, p_vote_type, now())
  on conflict (comment_id, user_id)
  do update set vote_type = excluded.vote_type, created_at = now();
end;
$$;


