import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  fetchLastMessageByConversation,
  truncateMessagePreview,
} from '@/lib/conversation-list-helpers'
import { displayNameFromRow } from '@/lib/display-user'
import { fetchUserProfilesForDisplay } from '@/lib/resolve-user-display'
import type { ChatDirectoryUser, ConversationListItem, ConversationListResponse } from '@/lib/chat-types'

type ConvRow = { id: string; type: string; name: string | null; created_at: string }

export async function GET(req: Request): Promise<NextResponse<ConversationListResponse>> {
  const requestUrl = new URL(req.url)
  const typeParam = requestUrl.searchParams.get('type')
  const typeFilter: 'direct' | 'group' | null =
    typeParam === 'direct' || typeParam === 'group' ? typeParam : null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: myParts, error: mpErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (mpErr) {
    return NextResponse.json({ error: mpErr.message }, { status: 400 })
  }

  const convIds = [...new Set((myParts ?? []).map((r) => r.conversation_id as string))]
  if (convIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const { data: convs, error: cErr } = await supabase
    .from('conversations')
    .select('id, type, name, created_at')
    .in('id', convIds)
    .order('created_at', { ascending: false })

  if (cErr || !convs) {
    return NextResponse.json({ error: cErr?.message ?? 'Failed to load conversations' }, { status: 400 })
  }

  let filteredConvs = convs as ConvRow[]
  if (typeFilter) {
    filteredConvs = filteredConvs.filter((c) => c.type === typeFilter)
  }

  const activeConvIds = filteredConvs.map((c) => c.id)
  if (activeConvIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const { data: allParticipants, error: apErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', activeConvIds)

  if (apErr || !allParticipants) {
    return NextResponse.json({ error: apErr.message }, { status: 400 })
  }

  const participantsByConv = new Map<string, string[]>()
  for (const row of allParticipants) {
    const cid = row.conversation_id as string
    const uid = row.user_id as string
    if (!participantsByConv.has(cid)) participantsByConv.set(cid, [])
    participantsByConv.get(cid)!.push(uid)
  }

  const directOtherIds = new Set<string>()
  for (const c of filteredConvs) {
    if (c.type !== 'direct') continue
    const ids = participantsByConv.get(c.id) ?? []
    const other = ids.find((id) => id !== user.id)
    if (other) directOtherIds.add(other)
  }

  const lastByConv = await fetchLastMessageByConversation(supabase, activeConvIds)
  const senderIds = [...new Set([...lastByConv.values()].map((m) => m.sender_id))]

  const allProfileIds = [...new Set([...directOtherIds, ...senderIds])]

  const profiles = await fetchUserProfilesForDisplay(allProfileIds)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey && allProfileIds.length > 0) {
    const { data: rows, error: uErr } = await supabase.from('users').select('*').in('id', allProfileIds)
    if (!uErr && rows) {
      const byId = new Map(
        (rows as Record<string, unknown>[]).map((row) => [row.id as string, row])
      )
      for (const id of allProfileIds) {
        const row = byId.get(id)
        profiles.set(id, {
          displayName: displayNameFromRow(row ?? null),
          avatar_url: (row?.avatar_url as string | null) ?? null,
        })
      }
    }
  }

  const peerMap = new Map<string, ChatDirectoryUser>()
  for (const id of directOtherIds) {
    const p = profiles.get(id)
    if (p) {
      peerMap.set(id, {
        id,
        username: p.displayName,
        email: null,
        avatar_url: p.avatar_url,
      })
    }
  }

  const baseItems: ConversationListItem[] = filteredConvs.map((c) => {
    const { id, name, created_at } = c
    const type = c.type as 'direct' | 'group'

    if (type === 'group') {
      const displayTitle = name?.trim() || 'Group chat'
      return {
        id,
        type,
        name,
        created_at,
        displayTitle,
        username: displayTitle,
        peer: null,
        lastMessagePreview: null as string | null,
      }
    }

    const ids = participantsByConv.get(id) ?? []
    const otherId = ids.find((x) => x !== user.id)
    const peer = otherId ? peerMap.get(otherId) ?? null : null
    const displayTitle = otherId
      ? (profiles.get(otherId)?.displayName ?? 'User')
      : 'Direct chat'

    return {
      id,
      type,
      name,
      created_at,
      displayTitle,
      username: displayTitle,
      peer,
      lastMessagePreview: null as string | null,
    }
  })

  const senderNameById = new Map<string, string>()
  for (const sid of senderIds) {
    senderNameById.set(sid, profiles.get(sid)?.displayName ?? 'User')
  }

  const items = baseItems.map((item) => {
    const last = lastByConv.get(item.id)
    if (!last) {
      return { ...item, lastMessagePreview: null }
    }

    const preview = truncateMessagePreview(last.content)
    const isMe = last.sender_id === user.id

    if (item.type === 'group') {
      const who = isMe ? 'You' : senderNameById.get(last.sender_id) ?? 'User'
      return {
        ...item,
        lastMessagePreview: `${who}: ${preview}`,
      }
    }

    return {
      ...item,
      lastMessagePreview: isMe ? `You: ${preview}` : preview,
    }
  })

  items.sort((a, b) => {
    const ta = lastByConv.get(a.id)?.created_at ?? a.created_at
    const tb = lastByConv.get(b.id)?.created_at ?? b.created_at
    return tb.localeCompare(ta)
  })

  return NextResponse.json({ data: items })
}
