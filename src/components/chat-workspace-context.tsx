'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { CreateGroupChatModal } from '@/components/create-group-chat-modal'
import type {
  ChatDirectoryUser,
  ConversationListItem,
  ConversationListResponse,
  UsersDirectoryResponse,
} from '@/lib/chat-types'
import { supabase } from '@/lib/supabase-client'

type ChatWorkspaceValue = {
  conversations: ConversationListItem[]
  conversationsLoading: boolean
  conversationsError: string | null
  refreshConversations: () => Promise<void>
  users: ChatDirectoryUser[]
  usersLoading: boolean
  openCreateGroupModal: () => void
}

const ChatWorkspaceContext = createContext<ChatWorkspaceValue | null>(null)

export function ChatWorkspaceProvider({
  children,
  scope,
}: {
  children: ReactNode
  /** `direct` = Messages (1:1 only). `group` = Groups section only. */
  scope: 'direct' | 'group'
}) {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [users, setUsers] = useState<ChatDirectoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  const listQuery = scope === 'direct' ? '?type=direct' : '?type=group'

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true)
    setConversationsError(null)
    const res = await fetch(`/api/conversation/list${listQuery}`, { credentials: 'same-origin' })
    const json = (await res.json()) as ConversationListResponse
    if (!res.ok) {
      const msg =
        'error' in json && typeof json.error === 'string' ? json.error : 'Failed to load conversations'
      setConversationsError(msg)
      setConversations([])
      setConversationsLoading(false)
      return
    }
    if ('data' in json) {
      setConversations(json.data)
    }
    setConversationsLoading(false)
  }, [listQuery])

  useEffect(() => {
    // Initial load; refreshConversations updates list state from the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch
    void refreshConversations()
  }, [refreshConversations])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) {
        setUsersLoading(false)
        return
      }
      const res = await fetch('/api/users/directory', { credentials: 'same-origin' })
      const json = (await res.json()) as UsersDirectoryResponse
      if (cancelled) return
      if (!res.ok || !('data' in json)) {
        setUsers([])
      } else {
        setUsers(json.data)
      }
      setUsersLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const openCreateGroupModal = useCallback(() => {
    if (scope !== 'group') return
    setGroupModalOpen(true)
  }, [scope])

  const onGroupCreated = useCallback(
    async (conversationId: string) => {
      await refreshConversations()
      router.push(`/groups/${conversationId}`)
    },
    [refreshConversations, router]
  )

  const value = useMemo(
    () => ({
      conversations,
      conversationsLoading,
      conversationsError,
      refreshConversations,
      users,
      usersLoading,
      openCreateGroupModal,
    }),
    [
      conversations,
      conversationsLoading,
      conversationsError,
      refreshConversations,
      users,
      usersLoading,
      openCreateGroupModal,
    ]
  )

  return (
    <ChatWorkspaceContext.Provider value={value}>
      {children}
      {scope === 'group' ? (
        <CreateGroupChatModal
          open={groupModalOpen}
          onOpenChange={setGroupModalOpen}
          users={users}
          onCreated={onGroupCreated}
        />
      ) : null}
    </ChatWorkspaceContext.Provider>
  )
}

export function useChatWorkspace() {
  const ctx = useContext(ChatWorkspaceContext)
  if (!ctx) {
    throw new Error('useChatWorkspace must be used within ChatWorkspaceProvider')
  }
  return ctx
}
