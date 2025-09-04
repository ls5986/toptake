-- Takes indexes
create index if not exists idx_takes_prompt_date on public.takes(prompt_date);
create index if not exists idx_takes_user_prompt on public.takes(user_id, prompt_date);
create index if not exists idx_takes_created_at on public.takes(created_at);

-- Comments indexes
create index if not exists idx_comments_take_id on public.comments(take_id);
create index if not exists idx_comments_parent on public.comments(parent_comment_id);

-- Reactions indexes
create index if not exists idx_take_reactions_take on public.take_reactions(take_id);
create index if not exists idx_take_reactions_actor on public.take_reactions(actor_id);

-- Notifications indexes
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);


