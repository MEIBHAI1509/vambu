import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const bodySchema = z
  .object({
    name: z.string().max(100).optional(),
    mobile: z.string().max(64).optional(),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal('')),
    avatar_url: z.string().max(2048).optional().nullable(),
    bio: z.string().max(2000).optional(),
  })
  .strict()

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.' },
      { status: 500 }
    )
  }

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

  const body = parsed.data

  const name = body.name?.trim() ?? ''
  const mobile = body.mobile?.trim() ?? ''
  const dob = body.dob === '' ? null : body.dob ?? null
  const bio = body.bio?.trim() ?? ''

  if (name && !/^[a-zA-Z0-9_.]{3,20}$/.test(name)) {
    return NextResponse.json(
      { error: 'Username (name) must be 3-20 chars: letters, numbers, underscore, dot.' },
      { status: 422 }
    )
  }

  let avatarUrl: string | null | undefined =
    body.avatar_url === undefined ? undefined : body.avatar_url
  if (avatarUrl === '') avatarUrl = null
  if (avatarUrl != null && !isValidHttpUrl(avatarUrl)) {
    return NextResponse.json({ error: 'avatar_url must be a valid http(s) URL' }, { status: 422 })
  }

  const authClient = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const updatePayload: Record<string, string | null> = {
    username: name || null,
    phone: mobile || null,
    dob,
    bio: bio || null,
  }

  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl
  }

  const { data, error } = await admin
    .from('users')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, username, phone, dob, bio, avatar_url')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
