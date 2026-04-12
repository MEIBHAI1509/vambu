import type { SupabaseClient } from '@supabase/supabase-js'

export async function isAppAdmin(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data: row, error } = await client
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()

  return !error && row !== null && (row as { is_admin: boolean }).is_admin === true
}
