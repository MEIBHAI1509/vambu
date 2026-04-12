-- Read receipts: required for POST /api/conversation/read and thread-meta.
-- Idempotent if 20260412120100 was already applied.

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;
