'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Cake,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Save,
  Smartphone,
  User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { cn } from '@/lib/cn'

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

const inputClass = cn(
  'w-full min-h-12 rounded-2xl bg-[var(--input-bg)] border border-border px-4 text-sm text-foreground',
  'placeholder:text-muted-foreground/80',
  'focus:outline-none focus:ring-2 focus:ring-[#141235]/20 focus:border-[#141235]/25',
  'dark:focus:ring-indigo-500/25 dark:focus:border-indigo-500/30',
  'transition-shadow duration-200'
)

const labelClass = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground'

function SectionTitle({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-3 mb-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[#141235] dark:text-indigo-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
    </div>
  )
}

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

  const displayName = useMemo(() => {
    const u = username.trim()
    if (u) return u
    return email?.split('@')[0] ?? 'Your name'
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
    setSuccess('Profile saved successfully.')
  }

  const displayAvatarSrc = previewObjectUrl ?? avatarUrl

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-3xl bg-card border border-border min-h-[280px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] dark:text-indigo-300" />
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative min-h-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-500/[0.12] via-violet-500/[0.06] to-transparent dark:from-indigo-500/15 dark:via-violet-500/10" />
        <div className="pointer-events-none absolute top-20 right-[10%] h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl dark:bg-fuchsia-500/15" />
        <div className="pointer-events-none absolute bottom-40 left-[5%] h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />

        <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex w-fit items-center gap-2 rounded-2xl border border-border bg-card/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-[var(--accent-soft)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 opacity-70" />
              Back to messages
            </button>
            <button
              type="button"
              onClick={() => void updateProfile()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#141235] dark:bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#141235]/20 dark:shadow-indigo-950/40 hover:opacity-92 disabled:opacity-55 transition-opacity sm:min-w-[140px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 space-y-6"
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-[var(--chat-surface)] shadow-sm">
              <div className="border-b border-border bg-gradient-to-r from-[var(--accent-soft)]/80 to-transparent px-6 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        'relative h-28 w-28 overflow-hidden rounded-3xl border-2 border-border bg-[var(--input-bg)] shadow-inner',
                        'ring-4 ring-background dark:ring-card'
                      )}
                    >
                      {displayAvatarSrc ? (
                        <Image
                          src={displayAvatarSrc}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover"
                          unoptimized={displayAvatarSrc.startsWith('blob:')}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/15 to-violet-500/20 text-3xl font-bold text-[#141235]/70 dark:text-indigo-200/90">
                          {initials}
                        </div>
                      )}
                    </div>
                    <label
                      className={cn(
                        'absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl',
                        'border-2 border-background bg-[#141235] text-white shadow-md dark:border-card dark:bg-indigo-600',
                        'hover:opacity-90 transition-opacity'
                      )}
                      title="Change photo"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          setAvatarFile(f ?? null)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{displayName}</h1>
                    {username.trim() ? (
                      <p className="mt-1 font-mono text-sm text-muted-foreground">@{username.trim()}</p>
                    ) : null}
                    {email ? (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate max-w-[min(100%,280px)]">{email}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                <section>
                  <SectionTitle icon={User}>Account</SectionTitle>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="profile-username" className={labelClass}>
                        <User className="h-3.5 w-3.5 opacity-70" />
                        Username
                      </label>
                      <input
                        id="profile-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your_name"
                        autoComplete="username"
                        className={inputClass}
                      />
                      <p className="text-xs text-muted-foreground">3–20 characters: letters, numbers, underscore, or dot.</p>
                    </div>

                    <div className="space-y-2">
                      <span className={labelClass}>
                        <Mail className="h-3.5 w-3.5 opacity-70" />
                        Email
                      </span>
                      <div className="flex min-h-12 items-center rounded-2xl border border-dashed border-border bg-[var(--input-bg)]/60 px-4 text-sm text-muted-foreground">
                        {email ?? '—'}
                      </div>
                      <p className="text-xs text-muted-foreground">Email is managed by your sign-in provider.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle icon={Smartphone}>Contact</SectionTitle>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="profile-phone" className={labelClass}>
                        <Smartphone className="h-3.5 w-3.5 opacity-70" />
                        Phone
                      </label>
                      <input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 000 0000"
                        inputMode="tel"
                        autoComplete="tel"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="profile-dob" className={labelClass}>
                        <Cake className="h-3.5 w-3.5 opacity-70" />
                        Date of birth
                      </label>
                      <input id="profile-dob" value={dob} onChange={(e) => setDob(e.target.value)} type="date" className={inputClass} />
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle icon={FileText}>About you</SectionTitle>
                  <div className="space-y-2">
                    <label htmlFor="profile-bio" className={labelClass}>
                      <FileText className="h-3.5 w-3.5 opacity-70" />
                      Bio
                    </label>
                    <textarea
                      id="profile-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short line about what you do or what you’re into…"
                      rows={5}
                      className={cn(inputClass, 'min-h-[140px] resize-y py-3 leading-relaxed')}
                    />
                  </div>
                </section>

                {(error || success) && (
                  <div className="space-y-3 pt-2">
                    {error ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="alert"
                        className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-800 dark:text-red-200/95"
                      >
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <span className="leading-snug">{error}</span>
                      </motion.div>
                    ) : null}
                    {success ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="status"
                        className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-sm text-emerald-900 dark:text-emerald-100/95"
                      >
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="leading-snug">{success}</span>
                      </motion.div>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/chat')}
                    className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-[var(--accent-soft)] transition-colors sm:hidden"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateProfile()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#141235] dark:bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:opacity-92 disabled:opacity-55 transition-opacity"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>

                <p className="text-center text-[10px] text-muted-foreground/80 sm:text-left">
                  Avatar images are stored in your private folder in the <span className="font-medium">avatars</span> bucket.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
