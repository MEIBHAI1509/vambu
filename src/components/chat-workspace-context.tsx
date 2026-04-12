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
}

const ChatWorkspaceContext = createContext<ChatWorkspaceValue | null>(null)

export function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [users, setUsers] = useState<ChatDirectoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true)
    setConversationsError(null)
    const res = await fetch('/api/conversation/list', { credentials: 'same-origin' })
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
  }, [])

  useEffect(() => {
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

  const value = useMemo(
    () => ({
      conversations,
      conversationsLoading,
      conversationsError,
      refreshConversations,
      users,
      usersLoading,
    }),
    [conversations, conversationsLoading, conversationsError, refreshConversations, users, usersLoading]
  )

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>
}

export function useChatWorkspace() {
  const ctx = useContext(ChatWorkspaceContext)
  if (!ctx) {
    throw new Error('useChatWorkspace must be used within ChatWorkspaceProvider')
  }
  return ctx
}
