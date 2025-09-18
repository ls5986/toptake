-- Enforce moderator leave rule and add role/ownership RPCs

CREATE OR REPLACE FUNCTION public.leave_group(p_thread uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_is_mod boolean; v_mod_count integer; BEGIN
  SELECT (role = 'moderator') INTO v_is_mod FROM public.chat_participants
  WHERE thread_id = p_thread AND user_id = auth.uid();

  IF v_is_mod THEN
    SELECT count(*) INTO v_mod_count FROM public.chat_participants
    WHERE thread_id = p_thread AND role = 'moderator';
    IF v_mod_count <= 1 THEN
      RAISE EXCEPTION 'owner/moderator must transfer ownership before leaving';
    END IF;
  END IF;

  DELETE FROM public.chat_participants WHERE thread_id = p_thread AND user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.promote_moderator(p_thread uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  UPDATE public.chat_participants SET role = 'moderator'
  WHERE thread_id = p_thread AND user_id = p_user;
END $$;

CREATE OR REPLACE FUNCTION public.transfer_group_owner(p_thread uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- only current moderator can transfer; require target is participant
  IF NOT public.is_thread_moderator(p_thread, auth.uid()) THEN
    RAISE EXCEPTION 'not moderator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = p_thread AND user_id = p_user) THEN
    RAISE EXCEPTION 'target not in group';
  END IF;
  -- promote target and update created_by
  PERFORM public.promote_moderator(p_thread, p_user);
  UPDATE public.chat_threads SET created_by = p_user WHERE id = p_thread;
END $$;


