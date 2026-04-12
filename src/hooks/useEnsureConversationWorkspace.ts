'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatThreadMetaResponse } from '@/lib/chat-types'

/**
 * Redirects to the correct app section if the conversation type does not match the current route.
 */
export function useEnsureConversationWorkspace(
  conversationId: string,
  workspace: 'messages' | 'groups',
  enabled: boolean
) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled || !conversationId) return
    let cancelled = false
    const run = async () => {
      const res = await fetch(
        `/api/chat/thread-meta?conversationId=${encodeURIComponent(conversationId)}`,
        { credentials: 'same-origin' }
      )
      const json = (await res.json()) as ChatThreadMetaResponse
      if (cancelled || !res.ok || !('data' in json)) return
      const t = json.data
      const isGroup = t.conversationType === 'group'
      if (workspace === 'messages' && isGroup) {
        router.replace(`/groups/${conversationId}`)
        return
      }
      if (workspace === 'groups' && !isGroup) {
        router.replace(`/chat/${conversationId}`)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [conversationId, workspace, enabled, router])
}
