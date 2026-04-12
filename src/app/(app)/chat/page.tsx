'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, MessageSquare } from 'lucide-react'
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
      </motion.div>
    </div>
  )
}
