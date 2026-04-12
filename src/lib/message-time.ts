/**
 * Parse `created_at` from Postgres/Supabase JSON for display in the user's locale.
 * Strings without a timezone are treated as UTC (common when `Z` / offset is omitted).
 */
export function parseMessageCreatedAt(value: string): Date {
  let s = value.trim()
  if (!s) return new Date(NaN)
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T')
  }
  const hasExplicitZone =
    /Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{2}$/.test(s)
  if (!hasExplicitZone) {
    s = `${s}Z`
  }
  return new Date(s)
}

export function formatMessageTime(iso: string): string {
  try {
    const d = parseMessageCreatedAt(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

/** True if the peer’s read cursor is at or past this message (direct chats). */
export function isMessageReadByPeer(messageCreatedAt: string, peerLastReadAt: string | null): boolean {
  if (!peerLastReadAt) return false
  const sent = parseMessageCreatedAt(messageCreatedAt).getTime()
  const read = parseMessageCreatedAt(peerLastReadAt).getTime()
  if (Number.isNaN(sent) || Number.isNaN(read)) return false
  return read >= sent
}

const ONLINE_THRESHOLD_MS = 120_000

/** Online when heartbeat was recent; otherwise a human-readable last seen line (12-hour clock). */
export function getPeerPresence(lastSeenAt: string | null): { online: boolean; label: string } {
  if (!lastSeenAt) return { online: false, label: 'Offline' }
  const d = parseMessageCreatedAt(lastSeenAt)
  if (Number.isNaN(d.getTime())) return { online: false, label: 'Offline' }
  const ms = Date.now() - d.getTime()
  if (ms < ONLINE_THRESHOLD_MS) return { online: true, label: 'Online' }
  if (ms < 60_000) return { online: false, label: 'Last seen just now' }
  if (ms < 60 * 60_000) {
    return { online: false, label: `Last seen ${Math.floor(ms / 60_000)}m ago` }
  }
  const isToday = new Date().toDateString() === d.toDateString()
  if (isToday) {
    const t = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return { online: false, label: `Last seen today at ${t}` }
  }
  return {
    online: false,
    label: `Last seen ${d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`,
  }
}
