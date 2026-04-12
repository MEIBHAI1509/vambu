import type { createSupabaseServerClient } from '@/lib/supabase-server'

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>

const PREVIEW_MAX = 80

export function truncateMessagePreview(text: string, max = PREVIEW_MAX) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** One query per conversation; batched in parallel for correctness without a DB view. */
export async function fetchLastMessageByConversation(
  supabase: Supabase,
  conversationIds: string[]
): Promise<Map<string, { content: string; sender_id: string; created_at: string }>> {
  const map = new Map<string, { content: string; sender_id: string; created_at: string }>()
  const batchSize = 25

  for (let i = 0; i < conversationIds.length; i += batchSize) {
    const batch = conversationIds.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (conversationId) => {
        const { data, error } = await supabase
          .from('messages')
          .select('content, sender_id, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error || !data) return null
        return [
          conversationId,
          data as { content: string; sender_id: string; created_at: string },
        ] as const
      })
    )
    for (const r of results) {
      if (r) map.set(r[0], r[1])
    }
  }

  return map
}
