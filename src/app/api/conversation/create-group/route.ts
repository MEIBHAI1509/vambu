import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server'
import { insertGroupConversation } from '@/lib/create-group-conversation'
import type { CreateGroupChatResponse } from '@/lib/chat-types'

export const dynamic = 'force-dynamic'

const bodySchema = z
  .object({
    name: z.string().max(120),
    userIds: z.array(z.string().uuid()).max(500),
  })
  .strict()

export async function POST(request: NextRequest): Promise<NextResponse<CreateGroupChatResponse>> {
  const { supabase, applySupabaseCookies } = createSupabaseRouteHandlerClient(request)

  const respond = (body: CreateGroupChatResponse, status = 200) => {
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

  const nameParsed = z.string().trim().min(1).max(120).safeParse(parsed.data.name)
  if (!nameParsed.success) {
    return respond({ error: 'Group name is required' }, 400)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (process.env.NODE_ENV === 'development') {
    console.log('[api/conversation/create-group] getUser', {
      userId: user?.id ?? null,
      authError: authError?.message ?? null,
    })
  }

  if (authError || !user) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  const result = await insertGroupConversation(supabase, user.id, nameParsed.data, parsed.data.userIds)

  if (!result.ok) {
    return respond({ error: result.message }, result.status)
  }

  return respond({ data: { conversation: result.conversation } })
}
