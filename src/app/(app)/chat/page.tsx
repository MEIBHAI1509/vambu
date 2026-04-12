'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, MessageSquare, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

export default function ChatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      setLoading(false)
    }
    void checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-card border border-border min-h-[200px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] dark:text-indigo-300 mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading chat…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-w-0 min-h-0 bg-[var(--chat-surface)] p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md space-y-4"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center text-[#141235] dark:text-indigo-300">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Start a chat from the list or open{' '}
          <Link href="/groups" className="font-medium text-[#141235] dark:text-indigo-400 underline underline-offset-2">
            Groups
          </Link>{' '}
          for group conversations.
        </p>
        <Link
          href="/groups"
          className="lg:hidden w-full max-w-xs mx-auto text-sm font-medium rounded-xl border border-border px-4 py-2.5 hover:bg-[var(--accent-soft)] transition-colors flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4 shrink-0" />
          Go to groups
        </Link>
      </motion.div>
    </div>
  )
}
