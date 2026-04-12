import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isConversationParticipant } from '@/lib/chat-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const bodySchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict()

export async function POST(req: Request) {
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

  const now = new Date().toISOString()

  const isMissingLastReadColumn = (msg: string | undefined) =>
    !!msg && (msg.includes('last_read_at') || /schema cache/i.test(msg))

  const tryUser = await supabase
    .from('conversation_participants')
    .update({ last_read_at: now })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  if (!tryUser.error) {
    return NextResponse.json({ data: { lastReadAt: now } })
  }

  if (isMissingLastReadColumn(tryUser.error.message)) {
    return NextResponse.json({ data: { lastReadAt: null } })
  }

  const admin = createSupabaseAdminClient()
  if (admin) {
    const { error: adminErr } = await admin
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (!adminErr) {
      return NextResponse.json({ data: { lastReadAt: now } })
    }
    if (isMissingLastReadColumn(adminErr.message)) {
      return NextResponse.json({ data: { lastReadAt: null } })
    }
    return NextResponse.json({ error: adminErr.message }, { status: 400 })
  }

  return NextResponse.json({ error: tryUser.error.message }, { status: 400 })
}
