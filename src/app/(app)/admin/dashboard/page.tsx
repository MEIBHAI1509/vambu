'use client'

import { motion } from 'framer-motion'
import { BarChart3, MessageSquare, Users } from 'lucide-react'

const stats = [
  { label: 'Active chats', value: '—', icon: MessageSquare, hint: 'Connect your stats API' },
  { label: 'Team members', value: '—', icon: Users, hint: 'Supabase or admin API' },
  { label: 'Engagement', value: '—', icon: BarChart3, hint: 'Wire to analytics' },
]

export default function AdminDashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col min-h-0 rounded-3xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="border-b border-border px-6 py-5 md:px-8">
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your workspace — hook these cards to real data when ready.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-2xl border border-border bg-[var(--chat-surface)] p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-muted-foreground">{s.label}</span>
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-foreground">
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground tabular-nums">{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.hint}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
