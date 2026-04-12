export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  type: 'text'
  created_at: string
}

export type ChatDirectoryUser = {
  id: string
  username: string | null
  email?: string | null
  avatar_url: string | null
}

export type ConversationRow = {
  id: string
  type: 'direct' | 'group'
  name: string | null
  created_at: string
}

/** Row returned to the client for sidebar / headers */
export type ConversationListItem = ConversationRow & {
  /** Chat title (peer username for DMs, group name for groups) */
  displayTitle: string
  /** Same as displayTitle; explicit for sidebar “username” line */
  username: string
  peer: ChatDirectoryUser | null
  /** Truncated preview; may include "You:" or "Name:" prefix for groups */
  lastMessagePreview: string | null
}

export type CreateConversationResponse =
  | { data: { conversationId: string } }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type SendMessageResponse =
  | { data: MessageRow }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type MessagesListResponse =
  | { data: MessageRow[] }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type ChatThreadMetaDirect = {
  conversationType: 'direct'
  peerUserId: string
  peerLastReadAt: string | null
  peerLastSeenAt: string | null
}

export type ChatThreadMetaGroup = {
  conversationType: 'group'
}

export type ChatThreadMetaResponse =
  | { data: ChatThreadMetaDirect | ChatThreadMetaGroup }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type ConversationListResponse =
  | { data: ConversationListItem[] }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type AddParticipantsResponse =
  | { data: { added: number } }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }

export type UsersDirectoryResponse =
  | { data: ChatDirectoryUser[] }
  | { error: string }

export type UsersResolveResponse =
  | { data: { id: string; displayName: string; avatar_url: string | null }[] }
  | { error: string }
  | { error: { formErrors: string[]; fieldErrors: Record<string, string[]> } }
