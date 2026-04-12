-- Read receipts (blue ticks): updated when someone opens the thread (POST /api/conversation/read).

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;
