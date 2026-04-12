'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import type { ChatConversationProfileResponse } from '@/lib/chat-types'
import { getPeerPresence } from '@/lib/message-time'

const POPOVER_Z = 10000

function computePopoverPlacement(triggerEl: HTMLElement): { top: number; left: number; width: number } {
  const r = triggerEl.getBoundingClientRect()
  const margin = 8
  const maxW = Math.min(320, window.innerWidth - margin * 2)
  let left = r.left
  if (left + maxW > window.innerWidth - margin) {
    left = window.innerWidth - margin - maxW
  }
  if (left < margin) left = margin
  const top = r.bottom + 4
  return { top, left, width: maxW }
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value?.trim()
  if (!v) return null
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{v}</p>
    </div>
  )
}

export function ChatConversationProfilePopover({
  conversationId,
  currentUserId,
  isGroup,
  trigger,
}: {
  conversationId: string
  currentUserId: string
  isGroup: boolean
  trigger: ReactNode
}) {
  const triggerWrapRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ChatConversationProfileResponse | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conversation/profile-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ conversationId }),
      })
      const json = (await res.json()) as ChatConversationProfileResponse
      if (!res.ok || !('data' in json)) {
        const err = 'error' in json ? json.error : null
        setPayload(null)
        setError(typeof err === 'string' ? err : 'Could not load profile')
        return
      }
      setPayload(json)
    } catch {
      setPayload(null)
      setError('Could not load profile')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const updatePlacement = useCallback(() => {
    const el = triggerWrapRef.current
    if (!el) return
    setPlacement(computePopoverPlacement(el))
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null)
      return
    }
    updatePlacement()
    const onScrollOrResize = () => updatePlacement()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, updatePlacement])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerWrapRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    setOpen(false)
    setPayload(null)
    setError(null)
  }, [conversationId])

  const panel =
    open && placement ? (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={isGroup ? 'Group members' : 'Profile'}
        className="rounded-xl border border-border bg-card shadow-lg p-4 max-h-[min(70vh,22rem)] overflow-y-auto custom-scrollbar"
        style={{
          position: 'fixed',
          top: placement.top,
          left: placement.left,
          width: placement.width,
          zIndex: POPOVER_Z,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : payload && 'data' in payload ? (
          payload.data.kind === 'direct' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                  {payload.data.peer.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={payload.data.peer.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (payload.data.peer.username || payload.data.peer.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {payload.data.peer.username?.trim() ||
                      (payload.data.peer.email?.includes('@')
                        ? payload.data.peer.email.split('@')[0]
                        : payload.data.peer.email) ||
                      'User'}
                  </p>
                  {(() => {
                    const p = getPeerPresence(payload.data.peer.last_seen_at)
                    return (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.online ? (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" aria-hidden />
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">{p.label}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <div className="space-y-2.5 pt-1 border-t border-border">
                <DetailRow label="Username" value={payload.data.peer.username} />
                <DetailRow label="Email" value={payload.data.peer.email} />
                <DetailRow label="Phone" value={payload.data.peer.phone} />
                <DetailRow label="Bio" value={payload.data.peer.bio} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Members</p>
              <ul className="space-y-2">
                {payload.data.members.map((m) => {
                  const presence = getPeerPresence(m.last_seen_at)
                  const isYou = m.userId === currentUserId
                  return (
                    <li
                      key={m.userId}
                      className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-background/50 px-2.5 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 mt-0.5">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          m.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">
                            {m.displayName}
                            {isYou ? (
                              <span className="text-muted-foreground font-normal"> (you)</span>
                            ) : null}
                          </span>
                        </div>
                        {m.username?.trim() ? (
                          <p className="text-[11px] text-muted-foreground truncate">@{m.username.trim()}</p>
                        ) : null}
                        <div className="flex items-center gap-1.5 mt-1">
                          {presence.online ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" aria-hidden />
                          ) : null}
                          <span className="text-[10px] text-muted-foreground leading-snug">{presence.label}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        ) : null}
      </div>
    ) : null

  return (
    <div className="min-w-0" ref={triggerWrapRef}>
      <button
        type="button"
        className="flex items-center gap-3 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141235]/30 dark:focus-visible:ring-indigo-400/40"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
