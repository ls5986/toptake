-- Clean duplicates and enforce one take per user per date
with dups as (
  select id,
         row_number() over (partition by user_id, prompt_date order by created_at asc, id asc) as rn
  from public.takes
)
delete from public.takes t using dups
where t.id = dups.id and dups.rn > 1;

alter table public.takes
  add constraint takes_user_date_unique unique (user_id, prompt_date);


