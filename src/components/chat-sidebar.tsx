'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare, Users } from 'lucide-react'
import { useChatWorkspace } from '@/components/chat-workspace-context'
import { displayNameFromProfile } from '@/lib/display-user'
import { cn } from '@/lib/cn'

export function ChatSidebar() {
  const router = useRouter()
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    users,
    usersLoading,
  } = useChatWorkspace()

  const [startingUserId, setStartingUserId] = useState<string | null>(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [groupBusy, setGroupBusy] = useState(false)

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
        router.push(`/chat/${json.data.conversationId}`)
      } finally {
        setStartingUserId(null)
      }
    },
    [router, refreshConversations]
  )

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = groupName.trim()
    const memberIds = [...selectedMemberIds]
    if (!name || memberIds.length === 0 || groupBusy) return
    setGroupBusy(true)
    try {
      const res = await fetch('/api/conversation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ type: 'group', name, memberIds }),
      })
      const json = (await res.json()) as { data?: { conversationId: string }; error?: unknown }
      if (!res.ok || !json.data?.conversationId) {
        console.error('group create failed', json)
        return
      }
      setGroupName('')
      setSelectedMemberIds(new Set())
      setShowGroupForm(false)
      await refreshConversations()
      router.push(`/chat/${json.data.conversationId}`)
    } finally {
      setGroupBusy(false)
    }
  }

  return (
    <aside className="w-[300px] lg:w-[320px] bg-card border-l border-border hidden lg:flex flex-col z-20 shrink-0 min-h-0">
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Chats</h2>
          <Link
            href="/chat"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowGroupForm((v) => !v)}
          className="mt-3 w-full text-left text-sm font-medium rounded-xl border border-border px-3 py-2 hover:bg-[var(--accent-soft)] transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4 shrink-0" />
          New group
        </button>
        {showGroupForm ? (
          <form onSubmit={(e) => void createGroup(e)} className="mt-3 space-y-2 border border-border rounded-xl p-3 bg-[var(--chat-surface)]">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full text-sm rounded-lg border border-border bg-card px-2 py-1.5"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">Members</p>
            <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1">
              {users.map((u) => {
                const label = displayNameFromProfile(u)
                return (
                  <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(u.id)}
                      onChange={() => toggleMember(u.id)}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                )
              })}
            </div>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedMemberIds.size === 0 || groupBusy}
              className="w-full text-sm font-medium rounded-lg bg-[#141235] dark:bg-indigo-600 text-white py-2 disabled:opacity-50"
            >
              {groupBusy ? 'Creating…' : 'Create group'}
            </button>
          </form>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 px-1 mb-2 text-foreground">
            <MessageSquare className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Conversations</h3>
          </div>
          {conversationsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversationsError ? (
            <p className="text-xs text-destructive px-1">{conversationsError}</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    className="block rounded-xl px-2 py-2 text-sm hover:bg-[var(--accent-soft)] transition-colors min-w-0"
                  >
                    <span className="font-semibold text-foreground truncate block">{c.username}</span>
                    <span className="block text-[12px] text-muted-foreground truncate mt-0.5">
                      {c.lastMessagePreview ?? 'No messages yet'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

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
      </div>
    </aside>
  )
}
