-- Fix takes table to reference the new prompts table instead of daily_prompts
-- First, drop the existing foreign key constraint
ALTER TABLE public.takes DROP CONSTRAINT IF EXISTS takes_daily_prompt_id_fkey;

-- Add the new foreign key constraint to reference prompts table
ALTER TABLE public.takes 
ADD CONSTRAINT takes_daily_prompt_id_fkey 
FOREIGN KEY (daily_prompt_id) REFERENCES public.prompts(id) ON DELETE CASCADE;

-- Rename the column to be more consistent
ALTER TABLE public.takes RENAME COLUMN daily_prompt_id TO prompt_id;

-- Update the foreign key constraint name
ALTER TABLE public.takes DROP CONSTRAINT takes_daily_prompt_id_fkey;
ALTER TABLE public.takes 
ADD CONSTRAINT takes_prompt_id_fkey 
FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE CASCADE; 