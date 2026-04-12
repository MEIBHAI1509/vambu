import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { displayNameFromRow } from '@/lib/display-user'
import { fetchUserProfilesForDisplay } from '@/lib/resolve-user-display'
import type { UsersResolveResponse } from '@/lib/chat-types'

const bodySchema = z
  .object({
    userIds: z.array(z.string().uuid()).min(1).max(150),
  })
  .strict()

export async function POST(req: Request): Promise<NextResponse<UsersResolveResponse>> {
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

  const { userIds } = parsed.data
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceKey && url) {
    const profiles = await fetchUserProfilesForDisplay(userIds)
    const data = userIds.map((id) => {
      const p = profiles.get(id)!
      return { id, displayName: p.displayName, avatar_url: p.avatar_url }
    })
    return NextResponse.json({ data })
  }

  const { data: rows, error: qErr } = await supabase.from('users').select('*').in('id', userIds)
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 400 })
  }

  const byId = new Map((rows ?? []).map((row) => [(row as { id: string }).id, row as Record<string, unknown>]))
  const data = userIds.map((id) => {
    const row = byId.get(id)
    return {
      id,
      displayName: displayNameFromRow(row ?? null),
      avatar_url: (row?.avatar_url as string | null) ?? null,
    }
  })

  return NextResponse.json({ data })
}
