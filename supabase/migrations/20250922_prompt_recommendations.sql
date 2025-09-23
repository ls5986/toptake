-- Prompt recommendations table with RLS and admin policies

CREATE TABLE IF NOT EXISTS public.prompt_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','scheduled')),
  feedback_notes text,
  scheduled_for date,
  credit_awarded boolean NOT NULL DEFAULT false,
  credit_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_recs_status_created ON public.prompt_recommendations(status, created_at DESC);

ALTER TABLE public.prompt_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can insert their own suggestions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prompt_recs_insert_self' AND tablename='prompt_recommendations') THEN
    CREATE POLICY prompt_recs_insert_self ON public.prompt_recommendations
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Users can view their own; admins can view all pending
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prompt_recs_select' AND tablename='prompt_recommendations') THEN
    CREATE POLICY prompt_recs_select ON public.prompt_recommendations
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND coalesce(p.is_admin,false) = true
        )
      );
  END IF;
END $$;

-- Admins can update any row (approve/reject/schedule)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prompt_recs_update_admin' AND tablename='prompt_recommendations') THEN
    CREATE POLICY prompt_recs_update_admin ON public.prompt_recommendations
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND coalesce(p.is_admin,false) = true))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND coalesce(p.is_admin,false) = true));
  END IF;
END $$;


