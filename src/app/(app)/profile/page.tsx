'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type UserProfileRow = {
  id: string
  email: string | null
  username: string | null
  phone: string | null
  dob: string | null
  bio: string | null
  avatar_url: string | null
}

const uploadAvatar = async (
  file: File,
  userId: string
): Promise<{ url: string } | { error: string }> => {
  const extFromMime = (mime: string) => {
    const m: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    return m[mime] ?? 'img'
  }
  const ext =
    (file.name.includes('.') && file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
    extFromMime(file.type || 'image/jpeg')
  const filePath = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
    contentType: file.type || 'image/jpeg',
  })

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return { url: data.publicUrl }
}

const fieldClass =
  'w-full h-12 rounded-2xl bg-[var(--input-bg)] border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/30'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [email, setEmail] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const previewObjectUrl = useMemo(() => {
    if (!avatarFile) return null
    return URL.createObjectURL(avatarFile)
  }, [avatarFile])

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    }
  }, [previewObjectUrl])

  const initials = useMemo(() => {
    const base = (username || email || 'U').trim()
    return base.charAt(0).toUpperCase()
  }, [username, email])

  useEffect(() => {
    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      setEmail(session.user.email ?? null)

      const { data, error: qErr } = await supabase
        .from('users')
        .select('id, email, username, phone, dob, bio, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!qErr && data) {
        const row = data as UserProfileRow
        setUsername(row.username ?? '')
        setPhone(row.phone ?? '')
        setDob(row.dob ?? '')
        setBio(row.bio ?? '')
        setAvatarUrl(row.avatar_url ?? null)
      }

      setLoading(false)
    }

    boot()
  }, [router])

  const updateProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const cleanUsername = username.trim()
    if (cleanUsername && !/^[a-zA-Z0-9_\.]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 chars: letters, numbers, underscore, dot.')
      setSaving(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      return
    }

    let nextAvatarUrl: string | null = avatarUrl
    if (avatarFile) {
      const result = await uploadAvatar(avatarFile, user.id)
      if ('error' in result) {
        setError(result.error || 'Avatar upload failed.')
        setSaving(false)
        return
      }
      nextAvatarUrl = result.url
    }

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: cleanUsername || null,
        mobile: phone.trim() || null,
        dob: dob || '',
        avatar_url: nextAvatarUrl,
        bio: bio.trim() || null,
      }),
    })

    const payload = (await res.json()) as { error?: string | unknown; data?: unknown }

    if (!res.ok) {
      let msg =
        res.status === 401
          ? 'Session expired. Please sign in again.'
          : 'Profile update failed.'
      if (typeof payload.error === 'string') {
        msg = payload.error
      } else if (payload.error && typeof payload.error === 'object') {
        msg = JSON.stringify(payload.error)
      }
      setError(msg)
      setSaving(false)
      return
    }

    setAvatarUrl(nextAvatarUrl)
    setAvatarFile(null)
    setSaving(false)
    setSuccess('Profile saved.')
  }

  const displayAvatarSrc = previewObjectUrl ?? avatarUrl

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-3xl bg-card border border-border min-h-[200px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] dark:text-indigo-300" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-8 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-medium text-foreground hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to chat
            </button>

            <button
              type="button"
              onClick={() => void updateProfile()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#141235] dark:bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6"
          >
            <div className="rounded-3xl border border-border bg-[var(--chat-surface)] p-6 shadow-sm">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Your profile</h1>
                <p className="mt-1 text-sm text-muted-foreground truncate">{email}</p>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-border bg-[var(--input-bg)] shadow-inner shrink-0">
                  {displayAvatarSrc ? (
                    <Image
                      src={displayAvatarSrc}
                      alt="Avatar"
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={displayAvatarSrc.startsWith('blob:')}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {username.trim() ? `@${username.trim()}` : (email?.split('@')[0] ?? 'User')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>

                  <label className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-foreground hover:opacity-90 cursor-pointer transition-opacity">
                    <Camera className="w-4 h-4" />
                    Choose avatar
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        setAvatarFile(f ?? null)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Saved on Save to bucket <span className="font-semibold">avatars</span> at{' '}
                    <span className="font-mono">&#123;userId&#125;/&#123;timestamp&#125;.&#123;ext&#125;</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-[var(--chat-surface)] p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. vambu.ui"
                    className={fieldClass}
                  />
                  <p className="text-[11px] text-muted-foreground">3–20 chars: letters, numbers, underscore, dot.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Mobile number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Date of birth</label>
                  <input
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    type="date"
                    className={fieldClass}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people a little about you…"
                    rows={5}
                    className="w-full rounded-2xl bg-[var(--input-bg)] border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/30 resize-none"
                  />
                </div>
              </div>

              {(error || success) && (
                <div className="mt-5">
                  {error ? (
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
                      {error}
                    </div>
                  ) : null}
                  {success ? (
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                      {success}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void updateProfile()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#141235] dark:bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
