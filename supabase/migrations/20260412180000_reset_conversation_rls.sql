-- Reset RLS on chat tables: removes *all* existing policies (including RESTRICTIVE /
-- dashboard experiments) then applies one consistent policy set.
-- Fixes persistent "new row violates row-level security policy for table conversations"
-- when policies conflict or target the wrong role.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
  loop
    execute format('drop policy if exists %I on public.conversations', r.policyname);
  end loop;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversation_participants'
  loop
    execute format('drop policy if exists %I on public.conversation_participants', r.policyname);
  end loop;
end $$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

-- No "TO authenticated": rely on auth.uid() so any JWT-backed request passes checks;
-- anon sessions keep auth.uid() null and fail WITH CHECK / USING.

create policy "conversations_select_visible"
  on public.conversations
  for select
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

create policy "conversations_insert_creator"
  on public.conversations
  for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "conversations_delete_creator"
  on public.conversations
  for delete
  using (auth.uid() is not null and created_by = auth.uid());

create policy "conversation_participants_select_visible"
  on public.conversation_participants
  for select
  using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "conversation_participants_insert"
  on public.conversation_participants
  for insert
  with check (
    auth.uid() is not null
    and (
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
    )
  );

create policy "conversation_participants_update_self"
  on public.conversation_participants
  for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

notify pgrst, 'reload schema';
