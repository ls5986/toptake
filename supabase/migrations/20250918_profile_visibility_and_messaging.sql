-- Profile visibility + skip + messaging/groups schema
-- Safe to run multiple times; create objects if not exist and guard with IF statements

-- 1) Visibility enum and takes columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'profile_visibility_enum'
  ) THEN
    CREATE TYPE profile_visibility_enum AS ENUM ('public','anon','hidden','skip');
  END IF;
END $$;

ALTER TABLE IF EXISTS public.takes
  ADD COLUMN IF NOT EXISTS profile_visibility profile_visibility_enum NOT NULL DEFAULT 'public';

ALTER TABLE IF EXISTS public.takes
  ADD COLUMN IF NOT EXISTS is_skip boolean NOT NULL DEFAULT false;

-- Allow content to be NULL (for skips)
DO $$ BEGIN
  EXECUTE (
    SELECT CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'takes' AND column_name = 'content' AND is_nullable = 'NO'
    ) THEN 'ALTER TABLE public.takes ALTER COLUMN content DROP NOT NULL' ELSE 'SELECT 1' END
  );
END $$;

-- Constraint: is_skip aligns with profile_visibility, and skip must have null content
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'takes_skip_visibility_ck'
  ) THEN
    ALTER TABLE public.takes
      ADD CONSTRAINT takes_skip_visibility_ck
      CHECK (
        (profile_visibility = 'skip' AND is_skip = true AND content IS NULL)
        OR (profile_visibility <> 'skip' AND (is_skip = false OR is_skip IS FALSE))
      );
  END IF;
END $$;

-- Backfill existing rows
UPDATE public.takes SET profile_visibility = 'anon' WHERE is_anonymous = true AND profile_visibility = 'public';
UPDATE public.takes SET is_skip = true, profile_visibility = 'skip' WHERE content IS NULL AND (profile_visibility <> 'skip');

-- 2) Messaging / Groups schema
-- Threads represent DMs and Groups; participants map users; messages are posts
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  description text,
  privacy text NOT NULL DEFAULT 'private', -- 'public' | 'private'
  frequency text, -- 'daily' | 'weekly' | NULL
  prompt_source text, -- 'csv' | 'ai' | 'manual' | NULL
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'member' | 'moderator'
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'text', -- future: 'image', 'system'
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group prompts (per-thread schedule)
CREATE TABLE IF NOT EXISTS public.group_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  prompt_date date,
  created_by uuid REFERENCES public.profiles(id),
  source text NOT NULL DEFAULT 'manual', -- 'csv' | 'ai' | 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, prompt_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);

-- RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_prompts ENABLE ROW LEVEL SECURITY;

-- Threads visible to participants or public groups
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_threads' AND policyname='threads_select') THEN
    CREATE POLICY threads_select ON public.chat_threads
      FOR SELECT USING (
        privacy = 'public' OR EXISTS (
          SELECT 1 FROM public.chat_participants p
          WHERE p.thread_id = chat_threads.id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Participants: users can see their own rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='participants_select_self') THEN
    CREATE POLICY participants_select_self ON public.chat_participants
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- Messages: visible to participants of the thread
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages_select_participants') THEN
    CREATE POLICY messages_select_participants ON public.chat_messages
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Inserts guarded via RPCs (no broad insert policies)

-- 3) RPCs (helpers)
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_privacy text DEFAULT 'private',
  p_frequency text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_prompt_source text DEFAULT 'manual'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_thread uuid;
BEGIN
  INSERT INTO public.chat_threads(name, is_group, privacy, frequency, description, prompt_source, created_by)
  VALUES (p_name, true, COALESCE(p_privacy,'private'), p_frequency, p_description, COALESCE(p_prompt_source,'manual'), auth.uid())
  RETURNING id INTO v_thread;

  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES (v_thread, auth.uid(), 'moderator')
  ON CONFLICT DO NOTHING;

  RETURN v_thread;
END $$;

CREATE OR REPLACE FUNCTION public.join_group(p_thread uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.chat_participants(thread_id, user_id)
  SELECT p_thread, auth.uid()
  WHERE EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = p_thread AND (t.privacy = 'public' OR t.created_by = auth.uid()))
  ON CONFLICT DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.leave_group(p_thread uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.chat_participants WHERE thread_id = p_thread AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.send_message(p_thread uuid, p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; BEGIN
  -- ensure participant
  IF NOT EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = p_thread AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;
  INSERT INTO public.chat_messages(thread_id, sender_id, content)
  VALUES (p_thread, auth.uid(), p_content) RETURNING id INTO v_id;
  RETURN v_id;
END $$;


