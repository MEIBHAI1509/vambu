'use client'

import type { ReactNode } from 'react'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ChatWorkspaceProvider } from '@/components/chat-workspace-context'

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return (
    <ChatWorkspaceProvider scope="group">
      <div className="flex-1 flex h-full min-h-0 bg-card rounded-3xl shadow-sm overflow-hidden border border-border relative z-20">
        {children}
        <ChatSidebar variant="groups" />
      </div>
    </ChatWorkspaceProvider>
  )
}
