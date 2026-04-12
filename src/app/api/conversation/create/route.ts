import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server'
import { findDirectConversationId } from '@/lib/chat-server'
import { insertGroupConversation } from '@/lib/create-group-conversation'
import type { CreateConversationResponse } from '@/lib/chat-types'

export const dynamic = 'force-dynamic'

const directSchema = z
  .object({
    type: z.literal('direct'),
    otherUserId: z.string().uuid(),
  })
  .strict()

const groupSchema = z
  .object({
    type: z.literal('group'),
    name: z.string().trim().min(1).max(120),
    memberIds: z.array(z.string().uuid()).min(2).max(200),
  })
  .strict()

const bodySchema = z.discriminatedUnion('type', [directSchema, groupSchema])

export async function POST(request: NextRequest): Promise<NextResponse<CreateConversationResponse>> {
  const { supabase, applySupabaseCookies } = createSupabaseRouteHandlerClient(request)

  const respond = (body: CreateConversationResponse, status = 200) => {
    const res = NextResponse.json(body, { status })
    applySupabaseCookies(res)
    return res
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400)
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return respond({ error: parsed.error.flatten() }, 422)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (process.env.NODE_ENV === 'development') {
    console.log('[api/conversation/create] getUser', {
      userId: user?.id ?? null,
      authError: authError?.message ?? null,
    })
  }

  if (authError || !user) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  if (parsed.data.type === 'direct') {
    const { otherUserId } = parsed.data

    if (otherUserId === user.id) {
      return respond({ error: 'Cannot start a chat with yourself' }, 400)
    }

    const existingId = await findDirectConversationId(supabase, user.id, otherUserId)
    if (existingId) {
      return respond({ data: { conversationId: existingId } })
    }

    const { data: created, error: insertConvErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct', name: null, created_by: user.id })
      .select('id')
      .single()

    if (insertConvErr || !created) {
      return respond(
        { error: insertConvErr?.message ?? 'Failed to create conversation' },
        400
      )
    }

    const conversationId = (created as { id: string }).id

    const { error: partErr } = await supabase.from('conversation_participants').insert([
      { conversation_id: conversationId, user_id: user.id },
      { conversation_id: conversationId, user_id: otherUserId },
    ])

    if (partErr) {
      await supabase.from('conversations').delete().eq('id', conversationId)
      return respond({ error: partErr.message }, 400)
    }

    return respond({ data: { conversationId } })
  }

  const { name, memberIds } = parsed.data
  const result = await insertGroupConversation(supabase, user.id, name, memberIds)

  if (!result.ok) {
    return respond({ error: result.message }, result.status)
  }

  return respond({ data: { conversationId: result.conversation.id } })
}
