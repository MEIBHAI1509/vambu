'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { AppSidebar } from '@/components/app-sidebar'

type SidebarProfile = {
  email: string | null
  username: string | null
  avatarUrl: string | null
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sidebarUser, setSidebarUser] = useState<SidebarProfile>({
    email: null,
    username: null,
    avatarUrl: null,
  })

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const email = session.user.email ?? null

      const { data: row } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()

      setSidebarUser({
        email,
        username: (row?.username as string | null) ?? null,
        avatarUrl: (row?.avatar_url as string | null) ?? null,
      })
      setLoading(false)
    }
    void run()
  }, [router])

  useEffect(() => {
    if (loading) return
    const ping = () => {
      void fetch('/api/presence/heartbeat', { method: 'POST', credentials: 'same-origin' })
    }
    ping()
    const id = window.setInterval(ping, 40_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--app-canvas)] text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] dark:text-indigo-300 mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading workspace…</p>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] bg-[var(--app-canvas)] text-foreground overflow-hidden font-sans p-2 md:p-4 gap-3 md:gap-4">
      <AppSidebar user={sidebarUser} />
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">{children}</div>
    </div>
  )
}
