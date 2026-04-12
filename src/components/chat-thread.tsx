'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useChatWorkspace } from '@/components/chat-workspace-context'
import { useConversationMessages } from '@/hooks/useConversationMessages'
import type {
  ChatThreadMetaDirect,
  ChatThreadMetaGroup,
  ChatThreadMetaResponse,
  SendMessageResponse,
  UsersResolveResponse,
} from '@/lib/chat-types'
import { formatMessageTime, getPeerPresence, isMessageReadByPeer } from '@/lib/message-time'

function MessageDeliveryTicks({ read }: { read: boolean }) {
  const color = read
    ? 'text-sky-500 dark:text-sky-400'
    : 'text-foreground/50 dark:text-white/55'
  return (
    <span
      className={`inline-flex items-center shrink-0 ${color}`}
      aria-label={read ? 'Read' : 'Delivered'}
    >
      <Check className="h-3 w-3 -mr-2" strokeWidth={2.5} aria-hidden />
      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
    </span>
  )
}

export function ChatThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string
  currentUserId: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { conversations, refreshConversations } = useChatWorkspace()
  const meta = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  )

  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [threadMeta, setThreadMeta] = useState<ChatThreadMetaDirect | ChatThreadMetaGroup | null>(null)
  const [threadMetaError, setThreadMetaError] = useState<string | null>(null)

  const { messages, loading, error, reload, appendMessage } = useConversationMessages(conversationId)

  const title = meta?.displayTitle ?? 'Chat'
  const isGroup = meta?.type === 'group'
  const peerAvatar = meta?.type === 'direct' ? meta.peer?.avatar_url : null

  /** Sidebar says DM, or thread-meta confirmed direct (even before peer id is used). */
  const isDirectChat =
    meta?.type === 'direct' || threadMeta?.conversationType === 'direct'

  const peerLastReadAt =
    threadMeta?.conversationType === 'direct' ? threadMeta.peerLastReadAt : null

  const directPeerPresence = useMemo(() => {
    if (isGroup || !isDirectChat) return null
    if (threadMeta?.conversationType === 'direct') {
      return getPeerPresence(threadMeta.peerLastSeenAt)
    }
    if (threadMetaError) {
      return {
        online: false,
        label:
          threadMetaError.length > 72 ? `${threadMetaError.slice(0, 69)}…` : threadMetaError,
      }
    }
    return { online: false, label: 'Loading status…' }
  }, [isGroup, isDirectChat, threadMeta, threadMetaError])

  useEffect(() => {
    if (!conversationId) return
    if (error) return
    const t = window.setTimeout(() => {
      void fetch('/api/conversation/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ conversationId }),
      })
    }, 400)
    return () => window.clearTimeout(t)
  }, [conversationId, error, messages.length])

  /** Do not wait for messages to load — header presence should show immediately. */
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    const load = async () => {
      const res = await fetch(
        `/api/chat/thread-meta?conversationId=${encodeURIComponent(conversationId)}`,
        { credentials: 'same-origin' }
      )
      const json = (await res.json()) as ChatThreadMetaResponse
      if (cancelled) return
      if (!res.ok || !('data' in json)) {
        const err = 'error' in json ? json.error : null
        const msg =
          typeof err === 'string'
            ? err
            : `Could not load status (${res.status}). Check SUPABASE_SERVICE_ROLE_KEY and DB columns.`
        setThreadMetaError(msg)
        return
      }
      setThreadMetaError(null)
      setThreadMeta(json.data)
    }
    void load()
    const id = window.setInterval(load, 2000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [conversationId])

  useEffect(() => {
    if (!isGroup) return
    let cancelled = false
    const run = async () => {
      const { data: parts, error: pErr } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
      if (cancelled || pErr || !parts?.length) return
      const ids = [...new Set(parts.map((p) => p.user_id as string))]
      if (ids.length === 0) return

      const resolveRes = await fetch('/api/users/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userIds: ids }),
      })
      const resolveJson = (await resolveRes.json()) as UsersResolveResponse
      if (cancelled) return
      if (!resolveRes.ok || !('data' in resolveJson)) return

      const map: Record<string, string> = {}
      for (const row of resolveJson.data) {
        map[row.id] = row.displayName
      }
      setSenderNames(map)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [conversationId, isGroup])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const headerInitials = title
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = messageText.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ conversationId, content: text, type: 'text' }),
      })
      const json = (await res.json()) as SendMessageResponse
      if (!res.ok || !('data' in json)) {
        const msg = 'error' in json && typeof json.error === 'string' ? json.error : 'Failed to send'
        setSendError(msg)
        return
      }
      appendMessage(json.data)
      setMessageText('')
      void refreshConversations()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--chat-surface)]">
      <header className="min-h-14 shrink-0 px-4 py-2 flex items-center gap-3 border-b border-border bg-card">
        <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground lg:hidden pr-1">
          ←
        </Link>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
          {peerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={peerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            headerInitials
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h1 className="font-semibold text-foreground truncate min-w-0 leading-tight">{title}</h1>
          {directPeerPresence ? (
            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
              {directPeerPresence.online ? (
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"
                  aria-hidden
                />
              ) : null}
              <p className="text-[11px] text-muted-foreground truncate leading-snug">
                {directPeerPresence.label}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-sm">Loading messages…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 text-center gap-2 px-2">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="text-sm font-medium underline text-[#141235] dark:text-indigo-400"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No messages yet.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const senderLabel = isGroup && !isMe ? senderNames[msg.sender_id] : null
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {senderLabel ? (
                  <span className="text-[10px] font-medium text-muted-foreground ml-1">{senderLabel}</span>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    isMe
                      ? 'bg-[var(--bubble-me)] text-foreground rounded-br-md'
                      : 'bg-[var(--bubble-them)] border border-border rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div
                    className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <span className="text-[10px] opacity-70">
                      {formatMessageTime(msg.created_at)}
                    </span>
                    {isMe && !isGroup ? (
                      <MessageDeliveryTicks
                        read={isMessageReadByPeer(msg.created_at, peerLastReadAt)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="p-3 border-t border-border bg-card shrink-0">
        {sendError ? <p className="text-xs text-destructive mb-2">{sendError}</p> : null}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 items-center">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Message"
            disabled={sending || loading || !!error}
            className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sending || loading || !!error}
            className="shrink-0 w-10 h-10 rounded-xl bg-[#141235] dark:bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50"
            aria-label="Send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </footer>
    </div>
  )
}
