-- Create avatars bucket (idempotent) and ensure public read policies
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = EXCLUDED.public;

-- Policies (drop if exist, then recreate)
do $$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Avatars public read') then
    drop policy "Avatars public read" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Avatars authenticated write') then
    drop policy "Avatars authenticated write" on storage.objects;
  end if;
end $$;

create policy "Avatars public read" on storage.objects
for select using ( bucket_id = 'avatars' );

create policy "Avatars authenticated write" on storage.objects
for all to authenticated
using ( bucket_id = 'avatars' )
with check ( bucket_id = 'avatars' );


