-- Create direct message thread helper
CREATE OR REPLACE FUNCTION public.create_dm(p_other_username text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_other uuid;
  v_thread uuid;
BEGIN
  SELECT id INTO v_other FROM public.profiles WHERE lower(username) = lower(p_other_username) LIMIT 1;
  IF v_other IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  IF v_other = auth.uid() THEN
    RAISE EXCEPTION 'cannot dm self';
  END IF;

  -- Reuse existing DM if present
  SELECT t.id INTO v_thread
  FROM public.chat_threads t
  JOIN public.chat_participants p1 ON p1.thread_id = t.id AND p1.user_id = auth.uid()
  JOIN public.chat_participants p2 ON p2.thread_id = t.id AND p2.user_id = v_other
  WHERE t.is_group = false
  LIMIT 1;

  IF v_thread IS NOT NULL THEN
    RETURN v_thread;
  END IF;

  INSERT INTO public.chat_threads (is_group, name, privacy, created_by)
  VALUES (false, NULL, 'private', auth.uid())
  RETURNING id INTO v_thread;

  INSERT INTO public.chat_participants(thread_id, user_id) VALUES (v_thread, auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_participants(thread_id, user_id) VALUES (v_thread, v_other) ON CONFLICT DO NOTHING;
  RETURN v_thread;
END $$;


