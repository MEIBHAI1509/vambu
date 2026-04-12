import { createClient } from '@supabase/supabase-js'
import { displayNameFromRow } from '@/lib/display-user'

export type ResolvedProfile = {
  displayName: string
  avatar_url: string | null
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Loads display names for user ids using the service role (bypasses RLS on `users`).
 * Falls back to `auth.admin.getUserById` (email + user_metadata) when the profile row
 * does not yield a name.
 */
export async function fetchUserProfilesForDisplay(
  userIds: string[]
): Promise<Map<string, ResolvedProfile>> {
  const result = new Map<string, ResolvedProfile>()
  const unique = [...new Set(userIds)].filter(Boolean)
  for (const id of unique) {
    result.set(id, { displayName: 'User', avatar_url: null })
  }
  if (unique.length === 0) return result

  const admin = createSupabaseAdmin()
  if (!admin) {
    return result
  }

  const { data: rows, error } = await admin.from('users').select('*').in('id', unique)

  const byId = new Map<string, Record<string, unknown>>()
  if (!error && rows) {
    for (const row of rows as Record<string, unknown>[]) {
      const id = row.id as string
      if (id) byId.set(id, row)
    }
  }

  await Promise.all(
    unique.map(async (id) => {
      const row = byId.get(id)
      let displayName = displayNameFromRow(row ?? null)
      let avatarUrl =
        (row?.avatar_url as string | undefined) ||
        (row?.picture as string | undefined) ||
        null

      if (displayName === 'User') {
        const { data, error: authErr } = await admin.auth.admin.getUserById(id)
        if (!authErr && data?.user) {
          const u = data.user
          const meta = (u.user_metadata ?? {}) as Record<string, unknown>
          const metaStr = (k: string) => {
            const v = meta[k]
            return typeof v === 'string' && (v as string).trim() ? (v as string).trim() : ''
          }
          const fromMeta =
            metaStr('full_name') ||
            metaStr('name') ||
            metaStr('preferred_username') ||
            metaStr('username') ||
            metaStr('user_name')

          displayName = displayNameFromRow({
            username: fromMeta || null,
            email: (u.email as string) ?? null,
            name: null,
            full_name: null,
          })

          const pic = metaStr('avatar_url') || metaStr('picture')
          if (pic) avatarUrl = pic
        }
      }

      result.set(id, { displayName, avatar_url: avatarUrl })
    })
  )

  return result
}
