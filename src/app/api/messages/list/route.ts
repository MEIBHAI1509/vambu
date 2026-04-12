import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isConversationParticipant } from '@/lib/chat-server'
import type { MessageRow, MessagesListResponse } from '@/lib/chat-types'

const querySchema = z.object({
  conversationId: z.string().uuid(),
})

export async function GET(req: Request): Promise<NextResponse<MessagesListResponse>> {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ conversationId: url.searchParams.get('conversationId') ?? '' })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { conversationId } = parsed.data
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

  const { data: rows, error: listErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 400 })
  }

  return NextResponse.json({ data: (rows ?? []) as MessageRow[] })
}
