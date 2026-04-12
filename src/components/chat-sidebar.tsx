'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare, Users } from 'lucide-react'
import { useChatWorkspace } from '@/components/chat-workspace-context'
import { displayNameFromProfile } from '@/lib/display-user'
import { cn } from '@/lib/cn'

export function ChatSidebar({ variant }: { variant: 'messages' | 'groups' }) {
  const router = useRouter()
  const basePath = variant === 'groups' ? '/groups' : '/chat'
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    users,
    usersLoading,
    openCreateGroupModal,
  } = useChatWorkspace()

  const [startingUserId, setStartingUserId] = useState<string | null>(null)

  const openOrCreateDm = useCallback(
    async (otherUserId: string) => {
      setStartingUserId(otherUserId)
      try {
        const res = await fetch('/api/conversation/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ type: 'direct', otherUserId }),
        })
        const json = (await res.json()) as { data?: { conversationId: string }; error?: unknown }
        if (!res.ok || !json.data?.conversationId) {
          console.error('conversation/create failed', json)
          return
        }
        await refreshConversations()
        router.push(`${basePath}/${json.data.conversationId}`)
      } finally {
        setStartingUserId(null)
      }
    },
    [router, refreshConversations, basePath]
  )

  return (
    <>
      <aside className="w-[300px] lg:w-[320px] bg-card border-l border-border hidden lg:flex flex-col z-20 shrink-0 min-h-0">
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground">
              {variant === 'groups' ? 'Groups' : 'Messages'}
            </h2>
            <Link
              href={basePath}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
          </div>
          {variant === 'groups' ? (
            <button
              type="button"
              onClick={() => openCreateGroupModal()}
              className="mt-3 w-full text-left text-sm font-medium rounded-xl border border-border px-3 py-2 hover:bg-[var(--accent-soft)] transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4 shrink-0" />
              Create group
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 px-1 mb-2 text-foreground">
              <MessageSquare className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {variant === 'groups' ? 'Group chats' : 'Direct messages'}
              </h3>
            </div>
            {conversationsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversationsError ? (
              <p className="text-xs text-destructive px-1">{conversationsError}</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">
                {variant === 'groups' ? 'No group chats yet.' : 'No direct messages yet.'}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`${basePath}/${c.id}`}
                      className="block rounded-xl px-2 py-2 text-sm hover:bg-[var(--accent-soft)] transition-colors min-w-0"
                    >
                      <span className="font-semibold text-foreground truncate flex items-center gap-2 min-w-0">
                        <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{c.displayTitle}</span>
                      </span>
                      <span className="block text-[12px] text-muted-foreground truncate mt-0.5">
                        {c.lastMessagePreview ?? 'No messages yet'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {variant === 'messages' ? (
            <div className="p-3 flex-1 min-h-0 overflow-y-auto">
              <div className="flex items-center gap-2 px-1 mb-2 text-foreground">
                <Users className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">People</h3>
              </div>
              {usersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">No other users.</p>
              ) : (
                <ul className="space-y-0.5">
                  {users.map((u) => {
                    const label = displayNameFromProfile(u)
                    const busy = startingUserId === u.id
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => void openOrCreateDm(u.id)}
                          disabled={busy}
                          className={cn(
                            'w-full text-left rounded-xl px-2 py-2 text-sm hover:bg-[var(--accent-soft)] transition-colors flex items-center justify-between gap-2',
                            busy && 'opacity-60'
                          )}
                        >
                          <span className="truncate font-medium">{label}</span>
                          {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
