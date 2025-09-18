-- Group admin RPCs to manage members and prompts (SECURITY DEFINER to bypass RLS with checks)

CREATE OR REPLACE FUNCTION public.is_thread_moderator(p_thread uuid, p_user uuid)
RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE thread_id = p_thread AND user_id = p_user AND role = 'moderator'
  )
$$;

CREATE OR REPLACE FUNCTION public.add_group_member(p_thread uuid, p_username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user uuid; BEGIN
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  SELECT id INTO v_user FROM public.profiles WHERE lower(username) = lower(p_username) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES (p_thread, v_user, 'member') ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.remove_group_member(p_thread uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  DELETE FROM public.chat_participants WHERE thread_id = p_thread AND user_id = p_user;
END $$;

CREATE OR REPLACE FUNCTION public.add_group_prompt(p_thread uuid, p_prompt text, p_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; BEGIN
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  INSERT INTO public.group_prompts(thread_id, prompt_text, prompt_date, source)
  VALUES (p_thread, p_prompt, p_date, 'manual') RETURNING id INTO v_id;
  RETURN v_id;
END $$;


