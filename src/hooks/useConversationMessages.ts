'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { MessageRow, MessagesListResponse } from '@/lib/chat-types'

function sortByCreatedAt(a: MessageRow, b: MessageRow) {
  return a.created_at.localeCompare(b.created_at)
}

function mergeMessageRows(existing: MessageRow[], incoming: MessageRow[]): MessageRow[] {
  if (incoming.length === 0) return existing
  const map = new Map<string, MessageRow>()
  for (const m of existing) map.set(m.id, m)
  for (const m of incoming) map.set(m.id, m)
  return [...map.values()].sort(sortByCreatedAt)
}

const POLL_MS = 2000

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef(conversationId)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const fetchList = useCallback(async (): Promise<MessageRow[] | null> => {
    const id = conversationIdRef.current
    if (!id) return null
    const res = await fetch(`/api/messages/list?conversationId=${encodeURIComponent(id)}`, {
      credentials: 'same-origin',
    })
    const json = (await res.json()) as MessagesListResponse
    if (!res.ok) {
      return null
    }
    if ('data' in json) {
      return [...json.data].sort(sortByCreatedAt)
    }
    return []
  }, [])

  const reload = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch(
      `/api/messages/list?conversationId=${encodeURIComponent(conversationId)}`,
      { credentials: 'same-origin' }
    )
    const json = (await res.json()) as MessagesListResponse
    if (!res.ok) {
      const msg =
        'error' in json && typeof json.error === 'string' ? json.error : 'Failed to load messages'
      setError(msg)
      setMessages([])
      setLoading(false)
      return
    }
    if ('data' in json) {
      setMessages([...json.data].sort(sortByCreatedAt))
    }
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [reload])

  /** Polling: Supabase Realtime postgres_changes only delivers if the table is in the realtime publication and RLS allows it; this keeps other participants in sync regardless. */
  useEffect(() => {
    if (!conversationId || loading) return

    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void (async () => {
        const rows = await fetchList()
        const activeId = conversationIdRef.current
        if (rows === null || activeId !== conversationId) return
        setMessages((prev) => {
          if (prev.some((m) => m.conversation_id !== activeId)) return rows
          return mergeMessageRows(prev, rows)
        })
      })()
    }

    const intervalId = setInterval(poll, POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [conversationId, loading, fetchList])

  const appendMessage = useCallback((row: MessageRow) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev
      return [...prev, row].sort(sortByCreatedAt)
    })
  }, [])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`, {
        config: { private: false },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>
          const row: MessageRow = {
            id: String(raw.id),
            conversation_id: String(raw.conversation_id),
            sender_id: String(raw.sender_id),
            content: String(raw.content ?? ''),
            type: raw.type === 'text' ? 'text' : 'text',
            created_at: String(raw.created_at ?? ''),
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [...prev, row].sort(sortByCreatedAt)
          })
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' && process.env.NODE_ENV === 'development') {
          console.warn('[realtime messages]', err?.message ?? status)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  return { messages, loading, error, reload, setMessages, appendMessage }
}
