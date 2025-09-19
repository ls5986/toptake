-- Link chat messages to group's daily prompt and provide RPC to reply

-- 1) Schema: add nullable foreign key to group_prompts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='chat_messages' AND column_name='group_prompt_id'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD COLUMN group_prompt_id uuid NULL REFERENCES public.group_prompts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful index for filtering replies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_chat_messages_group_prompt'
  ) THEN
    CREATE INDEX idx_chat_messages_group_prompt ON public.chat_messages(group_prompt_id);
  END IF;
END $$;

-- Ensure one reply per user per prompt at the database level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uniq_chat_prompt_reply'
  ) THEN
    CREATE UNIQUE INDEX uniq_chat_prompt_reply
      ON public.chat_messages(group_prompt_id, sender_id)
      WHERE group_prompt_id IS NOT NULL;
  END IF;
END $$;

-- 2) RPC: reply_to_group_prompt(thread -> message linked to today's prompt)
CREATE OR REPLACE FUNCTION public.reply_to_group_prompt(
  p_thread uuid,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_prompt_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  -- ensure participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants p
    WHERE p.thread_id = p_thread AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  -- fetch today's prompt id for this thread
  SELECT gp.id INTO v_prompt_id
  FROM public.group_prompts gp
  WHERE gp.thread_id = p_thread AND gp.prompt_date = v_today
  LIMIT 1;

  IF v_prompt_id IS NULL THEN
    RAISE EXCEPTION 'no prompt set for today';
  END IF;

  -- prevent multiple replies by same user
  IF EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.group_prompt_id = v_prompt_id AND m.sender_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'already_replied';
  END IF;

  INSERT INTO public.chat_messages(thread_id, sender_id, content, message_type, group_prompt_id)
  VALUES (p_thread, auth.uid(), p_content, 'prompt_reply', v_prompt_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;


