-- Keep public.users aligned with auth.users so profile, directory, and FKs stay consistent.
-- Chat participant IDs are auth user UUIDs; conversation APIs do not require a prior public.users row.

create or replace function public.sync_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.users.email);

  return new;
end;
$$;

comment on function public.sync_user_from_auth() is
  'Upserts public.users when auth.users is inserted or email changes; uses auth as source of truth for id.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.sync_user_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row
  execute procedure public.sync_user_from_auth();

-- One-time backfill for accounts created before this migration (optional, run in SQL editor if needed):
-- insert into public.users (id, email, created_at)
-- select id, email, created_at from auth.users
-- on conflict (id) do update set email = coalesce(excluded.email, public.users.email);
