import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConversationParticipant } from '@/lib/chat-server'
import type { MessageRow, SendMessageResponse } from '@/lib/chat-types'

const bodySchema = z
  .object({
    conversationId: z.string().uuid(),
    content: z.string().trim().min(1).max(8000),
    type: z.enum(['text']).optional(),
  })
  .strict()

export async function POST(req: Request): Promise<NextResponse<SendMessageResponse>> {
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

  const { conversationId, content, type: typeIn } = parsed.data
  const type = typeIn ?? 'text'
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const member = await isConversationParticipant(supabase, user.id, conversationId)
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: row, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      type,
    })
    .select('id, conversation_id, sender_id, content, type, created_at')
    .single()

  if (insertErr || !row) {
    return NextResponse.json({ error: insertErr?.message ?? 'Failed to send message' }, { status: 400 })
  }

  return NextResponse.json({ data: row as MessageRow })
}
