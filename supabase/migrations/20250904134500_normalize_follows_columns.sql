-- Normalize follows schema to use followee_id consistently
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'follows' and column_name = 'followed_id'
  ) then
    begin
      alter table public.follows rename column followed_id to followee_id;
    exception when undefined_column then
      -- already renamed
      null;
    end;
  end if;
end$$;

-- Ensure unique constraint on (follower_id, followee_id)
do $$
declare
  conname text;
begin
  -- drop any unique constraints that reference followed_id
  for conname in
    select con.conname
    from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'follows' and con.contype = 'u'
  loop
    execute format('alter table public.follows drop constraint %I', conname);
  end loop;
  -- recreate desired unique
  begin
    alter table public.follows add constraint follows_unique unique(follower_id, followee_id);
  exception when duplicate_table then null; end;
end$$;

-- Ensure policies exist
do $$
begin
  -- insert policy
  begin
    create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
  exception when duplicate_object then null; end;
  -- select policies (public readability handled elsewhere)
end$$;


