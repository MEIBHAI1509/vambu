/** Resolve a friendly label from a profile row (DB or metadata). Never use raw user id. */
export function displayNameFromRow(row: Record<string, unknown> | null | undefined): string {
  if (!row || typeof row !== 'object') return 'User'

  const s = (k: string) => {
    const v = row[k]
    return typeof v === 'string' && v.trim() ? v.trim() : ''
  }

  const combined = [s('first_name'), s('last_name')].filter(Boolean).join(' ')
  const name =
    s('username') ||
    s('name') ||
    s('full_name') ||
    s('display_name') ||
    combined

  if (name) return name

  const email = s('email')
  if (email) {
    const at = email.indexOf('@')
    return at > 0 ? email.slice(0, at) : email
  }

  return 'User'
}

/** Narrow typed helper for simple shapes. */
export function displayNameFromProfile(row: {
  username?: string | null
  email?: string | null
  name?: string | null
}): string {
  return displayNameFromRow(row as Record<string, unknown>)
}
