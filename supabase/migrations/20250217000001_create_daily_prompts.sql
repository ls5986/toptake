-- Create daily_prompts table for TopTake app
CREATE TABLE IF NOT EXISTS public.daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  prompt_date DATE NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  category TEXT DEFAULT 'general',
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  scheduled_for TIMESTAMPTZ,
  scheduled_by UUID REFERENCES auth.users(id),
  scheduled_reason TEXT,
  activation_status TEXT DEFAULT 'active' NOT NULL,
  activation_notes TEXT,
  activation_date TIMESTAMPTZ,
  activation_by UUID REFERENCES auth.users(id),
  analytics_data JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Add RLS policies
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active prompts
CREATE POLICY "Anyone can view active prompts"
  ON public.daily_prompts FOR SELECT
  USING (is_active = true);

-- Admins can view all prompts
CREATE POLICY "Admins can view all prompts"
  ON public.daily_prompts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Admins can insert prompts
CREATE POLICY "Admins can insert prompts"
  ON public.daily_prompts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Admins can update prompts
CREATE POLICY "Admins can update prompts"
  ON public.daily_prompts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Admins can delete prompts
CREATE POLICY "Admins can delete prompts"
  ON public.daily_prompts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_daily_prompts_date ON public.daily_prompts(prompt_date);
CREATE INDEX IF NOT EXISTS idx_daily_prompts_active ON public.daily_prompts(is_active);

-- Insert today's prompt (2025-09-02)
INSERT INTO public.daily_prompts (
  prompt_text,
  prompt_date,
  is_active,
  category,
  engagement_score
) VALUES (
  'What''s an opinion you''re scared to share?',
  '2025-09-02',
  true,
  'controversial',
  85
) ON CONFLICT (prompt_date) DO NOTHING;

-- Insert tomorrow's prompt
INSERT INTO public.daily_prompts (
  prompt_text,
  prompt_date,
  is_active,
  category,
  engagement_score
) VALUES (
  'What''s the pettiest thing you''ve ever done?',
  '2025-09-03',
  true,
  'petty',
  78
) ON CONFLICT (prompt_date) DO NOTHING;

-- Insert a few more prompts for testing
INSERT INTO public.daily_prompts (
  prompt_text,
  prompt_date,
  is_active,
  category,
  engagement_score
) VALUES 
  ('What''s a hill you''ll die on?', '2025-09-04', true, 'funny', 82),
  ('What''s something you believe that most people disagree with?', '2025-09-05', true, 'controversial', 88),
  ('What''s the most embarrassing thing that happened to you this week?', '2025-09-06', true, 'vulnerable', 75)
ON CONFLICT (prompt_date) DO NOTHING;
