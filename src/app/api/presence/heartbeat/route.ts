import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const admin = createSupabaseAdminClient()
  if (admin) {
    const { error: adminErr } = await admin.from('users').update({ last_seen_at: now }).eq('id', user.id)
    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 })
    }
    return NextResponse.json({ data: { lastSeenAt: now } })
  }

  const { error } = await supabase.from('users').update({ last_seen_at: now }).eq('id', user.id)
  if (error) {
    return NextResponse.json(
      {
        error: `${error.message} (add SUPABASE_SERVICE_ROLE_KEY to .env.local so presence can bypass RLS.)`,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({ data: { lastSeenAt: now } })
}
