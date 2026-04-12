import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { displayNameFromRow } from '@/lib/display-user'
import { fetchUserProfilesForDisplay } from '@/lib/resolve-user-display'
import type { ChatDirectoryUser, UsersDirectoryResponse } from '@/lib/chat-types'

export async function GET(): Promise<NextResponse<UsersDirectoryResponse>> {
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
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: rows, error } = await admin.from('users').select('id').neq('id', user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const ids = (rows ?? []).map((r) => (r as { id: string }).id)
    const profiles = await fetchUserProfilesForDisplay(ids)
    const data: ChatDirectoryUser[] = ids.map((id) => {
      const p = profiles.get(id)!
      return {
        id,
        username: p.displayName,
        email: null,
        avatar_url: p.avatar_url,
      }
    })
    data.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', undefined, { sensitivity: 'base' }))
    return NextResponse.json({ data })
  }

  const { data: rows, error: qErr } = await supabase
    .from('users')
    .select('*')
    .neq('id', user.id)
    .order('username', { ascending: true })

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 400 })
  }

  const data: ChatDirectoryUser[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const id = r.id as string
    return {
      id,
      username: displayNameFromRow(r),
      email: (r.email as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
    }
  })

  return NextResponse.json({ data })
}
