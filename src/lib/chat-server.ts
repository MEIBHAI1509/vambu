import type { createSupabaseServerClient } from '@/lib/supabase-server'

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function findDirectConversationId(
  supabase: Supabase,
  me: string,
  otherUserId: string
): Promise<string | null> {
  const { data: myRows, error: myErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', me)

  if (myErr || !myRows?.length) return null

  const myConversationIds = [...new Set(myRows.map((r) => r.conversation_id as string))]

  const { data: allParts, error: partsErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', myConversationIds)

  if (partsErr || !allParts?.length) return null

  const byConv = new Map<string, Set<string>>()
  for (const row of allParts) {
    const cid = row.conversation_id as string
    const uid = row.user_id as string
    if (!byConv.has(cid)) byConv.set(cid, new Set())
    byConv.get(cid)!.add(uid)
  }

  const pairIds: string[] = []
  for (const [cid, users] of byConv) {
    if (users.size === 2 && users.has(me) && users.has(otherUserId)) {
      pairIds.push(cid)
    }
  }

  if (pairIds.length === 0) return null

  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('id')
    .in('id', pairIds)
    .eq('type', 'direct')
    .limit(1)

  if (convErr || !convs?.length) return null
  return (convs[0] as { id: string }).id
}

export async function isConversationParticipant(
  supabase: Supabase,
  userId: string,
  conversationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  return !error && !!data
}
