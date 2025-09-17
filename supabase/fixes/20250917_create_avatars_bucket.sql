-- Ensure public avatars bucket exists with sane policies
-- Safe re-run

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = EXCLUDED.public;

-- Enable RLS (already enabled by default for storage.objects)
alter table if exists storage.objects enable row level security;

-- Drop existing policies if present (idempotent)
do $$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Avatars public read') then
    drop policy "Avatars public read" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Avatars authenticated write') then
    drop policy "Avatars authenticated write" on storage.objects;
  end if;
end $$;

-- Public read for avatars bucket
create policy "Avatars public read" on storage.objects
for select using (bucket_id = 'avatars');

-- Authenticated users can upload/update/delete their own files in avatars bucket
create policy "Avatars authenticated write" on storage.objects
for all
to authenticated
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');


