import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConversationParticipant } from '@/lib/chat-server'
import type { AddParticipantsResponse } from '@/lib/chat-types'

const bodySchema = z
  .object({
    conversationId: z.string().uuid(),
    userIds: z.array(z.string().uuid()).min(1).max(100),
  })
  .strict()

export async function POST(req: Request): Promise<NextResponse<AddParticipantsResponse>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { conversationId, userIds } = parsed.data
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await isConversationParticipant(supabase, user.id, conversationId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('type')
    .eq('id', conversationId)
    .maybeSingle()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if ((conv as { type: string }).type !== 'group') {
    return NextResponse.json(
      { error: 'Participants can only be added to group conversations' },
      { status: 400 }
    )
  }

  const uniqueNew = [...new Set(userIds)]
  const { data: existingUsers, error: euErr } = await supabase.from('users').select('id').in('id', uniqueNew)

  if (euErr || !existingUsers || existingUsers.length !== uniqueNew.length) {
    return NextResponse.json({ error: 'One or more users were not found' }, { status: 404 })
  }

  const { data: existingParts, error: epErr } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .in('user_id', uniqueNew)

  if (epErr) {
    return NextResponse.json({ error: epErr.message }, { status: 400 })
  }

  const already = new Set((existingParts ?? []).map((r) => r.user_id as string))
  const toAdd = uniqueNew.filter((id) => !already.has(id))
  if (toAdd.length === 0) {
    return NextResponse.json({ data: { added: 0 } })
  }

  const rows = toAdd.map((uid) => ({ conversation_id: conversationId, user_id: uid }))
  const { error: insErr } = await supabase.from('conversation_participants').insert(rows)

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 })
  }

  return NextResponse.json({ data: { added: toAdd.length } })
}
