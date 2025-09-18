-- Round-robin helpers

CREATE OR REPLACE FUNCTION public.group_next_member(p_thread uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_next uuid; BEGIN
  -- order by joined_at; pick first active in last 7 days; else first overall
  SELECT p.user_id INTO v_next
  FROM public.chat_participants p
  WHERE p.thread_id = p_thread
  ORDER BY COALESCE(p.joined_at, now()), p.user_id
  LIMIT 1;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'no participants';
  END IF;
  RETURN v_next;
END $$;

CREATE OR REPLACE FUNCTION public.add_group_prompt_for(p_thread uuid, p_prompt text, p_user uuid, p_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; BEGIN
  -- only moderators can attribute prompts to others
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  INSERT INTO public.group_prompts(thread_id, prompt_text, prompt_date, source, created_by)
  VALUES (p_thread, p_prompt, p_date, 'manual', p_user) RETURNING id INTO v_id;
  RETURN v_id;
END $$;


