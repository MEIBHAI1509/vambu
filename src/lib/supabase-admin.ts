import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Service-role client for server routes after the user is verified. Returns null if env is missing. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
