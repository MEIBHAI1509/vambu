'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function WorkspacePlaceholder({
  title,
  description,
  backHref = '/chat',
}: {
  title: string
  description?: string
  backHref?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col min-h-0 rounded-3xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
        <Link
          href={backHref}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#141235] dark:bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to messages
        </Link>
      </div>
    </motion.div>
  )
}
