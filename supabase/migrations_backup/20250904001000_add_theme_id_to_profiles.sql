-- Add theme_id to profiles and allow users to update their own theme
alter table public.profiles add column if not exists theme_id text;

-- Optional: simple check constraint for known theme ids could be added later

-- Ensure RLS allows user to update their own theme (assumes update policy exists)
-- If not, create a minimal update policy:
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile';
  if not found then
    execute $$create policy "Users can update their own profile"
      on public.profiles for update using (auth.uid() = id)$$;
  end if;
end $$;


