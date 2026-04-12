import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConversationRow } from '@/lib/chat-types'

export type InsertGroupConversationResult =
  | { ok: true; conversation: ConversationRow }
  | { ok: false; status: number; message: string }

const MAX_MEMBERS = 200

/**
 * Creates a group with the creator plus at least two other distinct users (three participants minimum).
 * `otherUserIds` may contain duplicates or the creator’s id; those are ignored for the uniqueness rule.
 */
export async function insertGroupConversation(
  supabase: SupabaseClient,
  creatorId: string,
  rawName: string,
  otherUserIds: string[]
): Promise<InsertGroupConversationResult> {
  const name = rawName.trim()
  if (!name) {
    return { ok: false, status: 400, message: 'Group name is required' }
  }
  if (name.length > 120) {
    return { ok: false, status: 400, message: 'Group name is too long' }
  }

  const uniqueOthers = [...new Set(otherUserIds)].filter((id) => id !== creatorId)
  if (uniqueOthers.length < 2) {
    return {
      ok: false,
      status: 400,
      message: 'Select at least two other people (three participants including you).',
    }
  }
  if (uniqueOthers.length > MAX_MEMBERS) {
    return { ok: false, status: 400, message: 'Too many members' }
  }

  const allIds = [creatorId, ...uniqueOthers]

  const { data: created, error: insertConvErr } = await supabase
    .from('conversations')
    .insert({ type: 'group', name, created_by: creatorId })
    .select('id, type, name, created_at')
    .single()

  if (insertConvErr || !created) {
    return {
      ok: false,
      status: 400,
      message: insertConvErr?.message ?? 'Failed to create group',
    }
  }

  const conversation = created as ConversationRow
  const conversationId = conversation.id

  const rows = allIds.map((uid) => ({ conversation_id: conversationId, user_id: uid }))
  const { error: partErr } = await supabase.from('conversation_participants').insert(rows)

  if (partErr) {
    await supabase.from('conversations').delete().eq('id', conversationId)
    return { ok: false, status: 400, message: partErr.message }
  }

  return { ok: true, conversation }
}
