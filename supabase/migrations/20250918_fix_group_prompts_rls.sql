-- Fix group_prompts RLS policies
-- The table has RLS enabled but no policies, causing 403 errors

-- Allow participants to view group prompts for threads they're in
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_prompts' AND policyname='group_prompts_select_participants') THEN
    CREATE POLICY group_prompts_select_participants ON public.group_prompts
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = group_prompts.thread_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Allow participants to insert group prompts for threads they're in
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_prompts' AND policyname='group_prompts_insert_participants') THEN
    CREATE POLICY group_prompts_insert_participants ON public.group_prompts
      FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = group_prompts.thread_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Allow participants to update group prompts for threads they're in
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_prompts' AND policyname='group_prompts_update_participants') THEN
    CREATE POLICY group_prompts_update_participants ON public.group_prompts
      FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = group_prompts.thread_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Allow participants to delete group prompts for threads they're in
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_prompts' AND policyname='group_prompts_delete_participants') THEN
    CREATE POLICY group_prompts_delete_participants ON public.group_prompts
      FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = group_prompts.thread_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;
