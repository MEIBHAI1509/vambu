-- Run in Supabase SQL editor if you do not apply migrations via CLI.
-- Presence for “online / last seen” in chat headers.

alter table public.users add column if not exists last_seen_at timestamptz;

comment on column public.users.last_seen_at is 'Updated by the app heartbeat while the user is signed in.';
