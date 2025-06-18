-- 1. Create the new prompts table if it doesn't exist
create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_date date unique not null,
  prompt_text text not null,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- 2. Migrate data from daily_prompts if it exists
insert into prompts (prompt_date, prompt_text, created_at, is_active)
select prompt_date, prompt_text, created_at, coalesce(is_active, true)
from daily_prompts
on conflict (prompt_date) do nothing;

-- 3. Ensure all takes reference the correct prompt_date (assumes takes already have prompt_date)
-- If takes use prompt_id, you may need to update this logic.

-- 4. Archive the old daily_prompts table (rename instead of drop for safety)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'daily_prompts') then
    alter table daily_prompts rename to daily_prompts_archived;
  end if;
end $$;

-- 5. Add index for fast lookup
create unique index if not exists idx_prompts_prompt_date on prompts(prompt_date); 