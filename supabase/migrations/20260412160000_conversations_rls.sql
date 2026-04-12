-- Chat: RLS that matches app flow (create conversation with created_by, then add participants).
-- Fixes "new row violates row-level security policy for table conversations" when JWT is authenticated.

alter table public.conversations
  add column if not exists created_by uuid references auth.users (id);

alter table public.conversations enable row level security;

drop policy if exists "conversations_select_visible" on public.conversations;
create policy "conversations_select_visible"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "conversations_insert_creator" on public.conversations;
create policy "conversations_insert_creator"
  on public.conversations
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "conversations_delete_creator" on public.conversations;
create policy "conversations_delete_creator"
  on public.conversations
  for delete
  to authenticated
  using (created_by = auth.uid());

alter table public.conversation_participants enable row level security;

drop policy if exists "conversation_participants_select_visible" on public.conversation_participants;
create policy "conversation_participants_select_visible"
  on public.conversation_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_participants_insert" on public.conversation_participants;
create policy "conversation_participants_insert"
  on public.conversation_participants
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_participants.conversation_id
        and c.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_participants_update_self" on public.conversation_participants;
create policy "conversation_participants_update_self"
  on public.conversation_participants
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- PostgREST schema cache: pick up new columns/policies without waiting
notify pgrst, 'reload schema';
