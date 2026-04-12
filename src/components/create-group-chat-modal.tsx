'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Users } from 'lucide-react'
import type { ChatDirectoryUser, CreateGroupChatResponse } from '@/lib/chat-types'
import { displayNameFromProfile } from '@/lib/display-user'

type CreateGroupChatModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: ChatDirectoryUser[]
  onCreated: (conversationId: string) => void
}

export function CreateGroupChatModal({
  open,
  onOpenChange,
  users,
  onCreated,
}: CreateGroupChatModalProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setGroupName('')
    setSelectedIds(new Set())
    setError(null)
    setBusy(false)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onOpenChange])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const nameOk = groupName.trim().length > 0
  const otherCount = selectedIds.size
  const canSubmit = nameOk && otherCount >= 2 && !busy

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const userIds = [...selectedIds]
      const res = await fetch('/api/conversation/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: groupName.trim(), userIds }),
      })
      const json = (await res.json()) as CreateGroupChatResponse
      if (!res.ok || !('data' in json)) {
        const msg =
          'error' in json && typeof json.error === 'string'
            ? json.error
            : 'Could not create group'
        setError(msg)
        return
      }
      onOpenChange(false)
      onCreated(json.data.conversation.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => !busy && onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-group-title"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-md max-h-[min(90dvh,560px)] flex flex-col rounded-3xl border border-border bg-card shadow-2xl text-foreground overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border px-5 py-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
              <h2 id="create-group-title" className="text-lg font-semibold tracking-tight">
                Create group
              </h2>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
              <div className="px-5 pt-4 space-y-2 shrink-0">
                <label htmlFor="group-name" className="text-xs font-medium text-muted-foreground">
                  Group name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Weekend plans"
                  maxLength={120}
                  autoComplete="off"
                  className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="px-5 pt-4 flex-1 min-h-0 flex flex-col">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Add members <span className="text-foreground/70">(pick at least 2)</span>
                </p>
                <div className="flex-1 min-h-[160px] max-h-[240px] overflow-y-auto custom-scrollbar rounded-xl border border-border bg-muted/30 p-2 space-y-1">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-4 text-center">No other users yet.</p>
                  ) : (
                    users.map((u) => {
                      const label = displayNameFromProfile(u)
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-[var(--accent-soft)] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggle(u.id)}
                            className="rounded border-border"
                          />
                          <span className="truncate">{label}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {error ? (
                <p className="px-5 pt-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 border-t border-border">
                <button
                  type="button"
                  onClick={() => !busy && onOpenChange(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium bg-[#141235] dark:bg-indigo-600 text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create group'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
