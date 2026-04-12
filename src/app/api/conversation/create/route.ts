import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { findDirectConversationId } from '@/lib/chat-server'
import type { CreateConversationResponse } from '@/lib/chat-types'

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
    memberIds: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict()

const bodySchema = z.discriminatedUnion('type', [directSchema, groupSchema])

export async function POST(req: Request): Promise<NextResponse<CreateConversationResponse>> {
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

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (parsed.data.type === 'direct') {
    const { otherUserId } = parsed.data

    if (otherUserId === user.id) {
      return NextResponse.json({ error: 'Cannot start a chat with yourself' }, { status: 400 })
    }

    const { data: otherUser, error: otherErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', otherUserId)
      .maybeSingle()

    if (otherErr || !otherUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingId = await findDirectConversationId(supabase, user.id, otherUserId)
    if (existingId) {
      return NextResponse.json({ data: { conversationId: existingId } })
    }

    const { data: created, error: insertConvErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct', name: null })
      .select('id')
      .single()

    if (insertConvErr || !created) {
      return NextResponse.json(
        { error: insertConvErr?.message ?? 'Failed to create conversation' },
        { status: 400 }
      )
    }

    const conversationId = (created as { id: string }).id

    const { error: partErr } = await supabase.from('conversation_participants').insert([
      { conversation_id: conversationId, user_id: user.id },
      { conversation_id: conversationId, user_id: otherUserId },
    ])

    if (partErr) {
      await supabase.from('conversations').delete().eq('id', conversationId)
      return NextResponse.json({ error: partErr.message }, { status: 400 })
    }

    return NextResponse.json({ data: { conversationId } })
  }

  const { name, memberIds } = parsed.data
  const memberSet = new Set([user.id, ...memberIds])
  const allIds = [...memberSet]

  const { data: existingUsers, error: usersErr } = await supabase.from('users').select('id').in('id', allIds)

  if (usersErr || !existingUsers || existingUsers.length !== allIds.length) {
    return NextResponse.json({ error: 'One or more users were not found' }, { status: 404 })
  }

  const { data: created, error: insertConvErr } = await supabase
    .from('conversations')
    .insert({ type: 'group', name })
    .select('id')
    .single()

  if (insertConvErr || !created) {
    return NextResponse.json(
      { error: insertConvErr?.message ?? 'Failed to create group' },
      { status: 400 }
    )
  }

  const conversationId = (created as { id: string }).id

  const rows = allIds.map((uid) => ({ conversation_id: conversationId, user_id: uid }))
  const { error: partErr } = await supabase.from('conversation_participants').insert(rows)

  if (partErr) {
    await supabase.from('conversations').delete().eq('id', conversationId)
    return NextResponse.json({ error: partErr.message }, { status: 400 })
  }

  return NextResponse.json({ data: { conversationId } })
}
