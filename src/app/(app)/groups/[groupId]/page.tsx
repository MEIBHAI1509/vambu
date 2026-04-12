'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { ChatThread } from '@/components/chat-thread'
import { useEnsureConversationWorkspace } from '@/hooks/useEnsureConversationWorkspace'

const uuidSchema = z.string().uuid()

export default function GroupChatByIdPage() {
  const params = useParams()
  const router = useRouter()
  const rawId = params.groupId
  const groupId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''

  const parsed = uuidSchema.safeParse(groupId)
  const [sessionReady, setSessionReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!parsed.success) return
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserId(session.user.id)
      setSessionReady(true)
    }
    void run()
  }, [parsed.success, router])

  if (!parsed.success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
        <p className="text-sm text-muted-foreground">Invalid group link.</p>
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="mt-4 text-sm font-medium text-[#141235] dark:text-indigo-400 underline"
        >
          Back to groups
        </button>
      </div>
    )
  }

  if (!sessionReady || !userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#141235] dark:text-indigo-300 mb-4" />
        <p className="text-muted-foreground text-sm">Opening group…</p>
      </div>
    )
  }

  return <GroupThreadInner groupId={groupId} userId={userId} />
}

function GroupThreadInner({ groupId, userId }: { groupId: string; userId: string }) {
  useEnsureConversationWorkspace(groupId, 'groups', true)
  return <ChatThread conversationId={groupId} currentUserId={userId} workspace="groups" />
}
