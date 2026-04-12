import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isConversationParticipant } from '@/lib/chat-server'
import type { ChatConversationProfileResponse } from '@/lib/chat-types'
import { displayNameFromRow } from '@/lib/display-user'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

const bodySchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict()

type UserProfileCols = {
  id: string
  username: string | null
  email: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  last_seen_at: string | null
}

async function loadConversationType(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  conversationId: string
): Promise<'direct' | 'group' | null> {
  if (admin) {
    const { data, error } = await admin
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .maybeSingle()
    if (!error && data && typeof (data as { type: string }).type === 'string') {
      return (data as { type: string }).type as 'direct' | 'group'
    }
  }
  const { data, error } = await supabase
    .from('conversations')
    .select('type')
    .eq('id', conversationId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { type: string }).type as 'direct' | 'group'
}

async function participantUserIds(
  db: SupabaseClient,
  conversationId: string
): Promise<string[]> {
  const { data, error } = await db
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
  if (error || !data?.length) return []
  return [...new Set(data.map((r) => r.user_id as string))]
}

async function fetchUserRows(admin: SupabaseClient, ids: string[]): Promise<Map<string, UserProfileCols>> {
  const map = new Map<string, UserProfileCols>()
  if (ids.length === 0) return map
  const { data, error } = await admin
    .from('users')
    .select('id, username, email, phone, bio, avatar_url, last_seen_at')
    .in('id', ids)
  if (error || !data) return map
  for (const row of data as UserProfileCols[]) {
    if (row.id) map.set(row.id, row)
  }
  return map
}

export async function POST(req: Request): Promise<NextResponse<ChatConversationProfileResponse>> {
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

  const allowed = await isConversationParticipant(supabase, user.id, conversationId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Server needs SUPABASE_SERVICE_ROLE_KEY to load member profiles.' },
      { status: 503 }
    )
  }

  const convType = await loadConversationType(admin, supabase, conversationId)
  if (!convType) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const memberIds = await participantUserIds(admin, conversationId)
  if (memberIds.length === 0) {
    return NextResponse.json({ error: 'No participants' }, { status: 400 })
  }

  const rowsById = await fetchUserRows(admin, memberIds)

  if (convType === 'group') {
    const members = memberIds.map((userId) => {
      const row = rowsById.get(userId)
      const displayName = displayNameFromRow(
        row ? (row as unknown as Record<string, unknown>) : { id: userId }
      )
      return {
        userId,
        username: row?.username ?? null,
        displayName,
        avatar_url: row?.avatar_url ?? null,
        last_seen_at: row?.last_seen_at ?? null,
      }
    })
    members.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }))
    return NextResponse.json({ data: { kind: 'group', members } })
  }

  const peerId = memberIds.find((id) => id !== user.id) ?? null
  if (!peerId) {
    return NextResponse.json({ error: 'Direct chat peer not found' }, { status: 400 })
  }

  const row = rowsById.get(peerId) ?? null
  let email = row?.email ?? null
  const username = row?.username ?? null
  const phone = row?.phone ?? null
  const bio = row?.bio ?? null
  const avatar_url = row?.avatar_url ?? null
  const last_seen_at = row?.last_seen_at ?? null

  if (!row) {
    const { data: authUser, error: guErr } = await admin.auth.admin.getUserById(peerId)
    if (!guErr && authUser?.user?.email) {
      email = authUser.user.email
    }
  }

  return NextResponse.json({
    data: {
      kind: 'direct',
      peer: {
        userId: peerId,
        username,
        email,
        phone,
        bio,
        avatar_url,
        last_seen_at,
      },
    },
  })
}
