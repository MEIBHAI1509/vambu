-- INSERT ... RETURNING is checked against SELECT RLS. If SELECT only allows rows
-- where the user is already in conversation_participants, the creator cannot see
-- the new row until participants are inserted → the whole statement fails (often
-- reported as RLS violation on conversations).

alter table public.conversations
  add column if not exists created_by uuid references auth.users (id);

drop policy if exists "Users can view their conversations" on public.conversations;

create policy "Users can view their conversations"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or id in (
      select cp.conversation_id
      from public.conversation_participants cp
      where cp.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
