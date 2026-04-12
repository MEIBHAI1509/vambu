-- Safe if 20260412160000 already ran: ensures column exists and refreshes PostgREST.
-- Fixes: "Could not find the 'created_by' column of 'conversations' in the schema cache"

alter table public.conversations
  add column if not exists created_by uuid references auth.users (id);

notify pgrst, 'reload schema';
