import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isConversationParticipant } from '@/lib/chat-server'
import type { ChatThreadMetaResponse } from '@/lib/chat-types'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

const querySchema = z.object({
  conversationId: z.string().uuid(),
})

type PartRow = { user_id: string; last_read_at: string | null }

/** Prefer user_id + last_read_at; if column missing, select user_id only. */
async function loadParticipantRows(
  client: SupabaseClient,
  conversationId: string
): Promise<{ rows: PartRow[]; errorMessage: string | null }> {
  const full = await client
    .from('conversation_participants')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId)

  if (!full.error && full.data && full.data.length > 0) {
    return { rows: full.data as PartRow[], errorMessage: null }
  }

  const slim = await client
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)

  if (!slim.error && slim.data && slim.data.length > 0) {
    return {
      rows: (slim.data as { user_id: string }[]).map((r) => ({
        user_id: r.user_id,
        last_read_at: null,
      })),
      errorMessage: null,
    }
  }

  if (!slim.error && (!slim.data || slim.data.length === 0)) {
    return { rows: [], errorMessage: 'No participant rows' }
  }

  const msg = slim.error?.message ?? full.error?.message ?? 'No participant rows'
  return { rows: [], errorMessage: msg }
}

async function selectPeerLastSeen(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  peerUserId: string
): Promise<string | null> {
  if (admin) {
    const { data, error } = await admin
      .from('users')
      .select('last_seen_at')
      .eq('id', peerUserId)
      .maybeSingle()
    if (!error && data && 'last_seen_at' in data) {
      return (data.last_seen_at as string | null) ?? null
    }
  }

  const { data, error } = await supabase
    .from('users')
    .select('last_seen_at')
    .eq('id', peerUserId)
    .maybeSingle()

  if (error || !data) return null
  return (data.last_seen_at as string | null) ?? null
}

export async function GET(req: Request): Promise<NextResponse<ChatThreadMetaResponse>> {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    conversationId: url.searchParams.get('conversationId') ?? '',
  })
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

  const admin = createSupabaseAdminClient()

  let member = await isConversationParticipant(supabase, user.id, conversationId)
  if (!member && admin) {
    const { data } = await admin
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()
    member = !!data
  }
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let convType: 'direct' | 'group' | null = null

  if (admin) {
    const { data, error } = await admin
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .maybeSingle()
    if (!error && data && typeof (data as { type: string }).type === 'string') {
      convType = (data as { type: string }).type as 'direct' | 'group'
    }
  }

  if (convType === null) {
    const { data, error } = await supabase
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .maybeSingle()
    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ??
            'Conversation not found. Add SUPABASE_SERVICE_ROLE_KEY if RLS hides the conversations table.',
        },
        { status: 400 }
      )
    }
    convType = (data as { type: string }).type as 'direct' | 'group'
  }

  if (convType === 'group') {
    return NextResponse.json({ data: { conversationType: 'group' } })
  }

  const db = admin ?? supabase
  const { rows: parts, errorMessage } = await loadParticipantRows(db, conversationId)

  if (parts.length === 0) {
    return NextResponse.json(
      {
        error:
          errorMessage ??
          'Participants not found. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server only) and restart dev.',
      },
      { status: 400 }
    )
  }

  const peerRow = parts.find((r) => r.user_id !== user.id)
  if (!peerRow) {
    return NextResponse.json({
      data: {
        conversationType: 'direct',
        peerUserId: '',
        peerLastReadAt: null,
        peerLastSeenAt: null,
      },
    })
  }

  const peerUserId = peerRow.user_id
  const peerLastReadAt = peerRow.last_read_at
  const peerLastSeenAt = await selectPeerLastSeen(admin, supabase, peerUserId)

  return NextResponse.json({
    data: {
      conversationType: 'direct',
      peerUserId,
      peerLastReadAt,
      peerLastSeenAt,
    },
  })
}
