'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import {
  Calendar,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { STORAGE_URL } from '@/utils/common'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/cn'

const NAV = [
  { id: 'dashboard', href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
  { id: 'messages', href: '/chat', icon: MessageSquare, label: 'Messages' },
  { id: 'groups', href: '/groups', icon: Users, label: 'Groups' },
  // { id: 'favourites', href: '/favourites', icon: Star, label: 'Favourites' },
  // { id: 'calendar', href: '/calendar', icon: Calendar, label: 'Calendar' },
  // { id: 'ai-chat', href: '/ai-chat', icon: MessageSquare, label: 'AI Chat' },
  // { id: 'files', href: '/files', icon: FileText, label: 'Files' },
  // { id: 'settings', href: '/settings', icon: Settings, label: 'Settings' },
] as const

function isNavActive(pathname: string, href: string) {
  if (href === '/chat') {
    return pathname === '/chat' || pathname.startsWith('/chat/')
  }
  if (href === '/admin/dashboard') {
    return pathname.startsWith('/admin')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({
  user,
  isAdmin,
}: {
  user: {
    email: string | null
    username: string | null
    avatarUrl: string | null
  }
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const navItems = isAdmin ? NAV : NAV.filter((item) => item.id !== 'dashboard')

  useEffect(() => {
    if (!logoutConfirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogoutConfirmOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [logoutConfirmOpen])

  const displayName =
    user.username?.trim() ||
    (user.email ? user.email.split('@')[0] : null) ||
    'Account'
  const initialsBase = (user.username?.trim() || user.email || 'U').charAt(0).toUpperCase()

  const performLogout = async () => {
    setLogoutConfirmOpen(false)
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
    <AnimatePresence>
      {logoutConfirmOpen && (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close logout confirmation"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setLogoutConfirmOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-desc"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-[var(--sidebar-bg)] p-6 md:p-8 shadow-2xl text-white/90"
          >
            <h2 id="logout-dialog-title" className="text-lg md:text-xl font-semibold text-white tracking-tight">
              Stepping away for now?
            </h2>
            <p id="logout-dialog-desc" className="mt-3 text-sm md:text-[15px] leading-relaxed text-white/65">
              Signing out ends your session on this device—you&apos;ll need to sign in again to reach your chats and
              messages. Are you sure you&apos;d like to log out?
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium border border-white/15 bg-white/5 text-white/90 hover:bg-white/10 transition-colors"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={() => void performLogout()}
                className="rounded-2xl px-4 py-3 text-sm font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
              >
                Yes, log me out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-[80px] md:w-[260px] flex-shrink-0 rounded-3xl flex flex-col text-white/70 overflow-hidden shadow-xl z-30 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)]"
    >
      <div className="p-6 md:p-8 flex items-center gap-3">
        <Link href="/chat" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
          <Image
            src={`${STORAGE_URL}/logo/vambu-logo.png`}
            alt="Vambu"
            width={40}
            height={40}
            className="object-contain drop-shadow-md rounded-full"
          />
          <span className="hidden md:inline">Vambu</span>
        </Link>
      </div>

      <div className="px-3 md:px-4 pb-3">
        <ThemeToggle />
      </div>

      <nav className="flex-1 px-3 md:px-4 py-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, idx) => {
          const active = isNavActive(pathname, item.href)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + idx * 0.04 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-4 px-3 md:px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden group',
                  active
                    ? 'bg-white/10 text-white font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    active ? 'text-white' : 'text-white/50 group-hover:text-white/80 transition-colors'
                  )}
                />
                <span className="hidden md:block text-sm">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}

        <motion.button
          type="button"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => setLogoutConfirmOpen(true)}
          className="flex items-center gap-4 px-3 md:px-4 py-3 rounded-2xl transition-all duration-300 hover:bg-red-500/15 hover:text-red-200 text-white/60 mt-1"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden md:block text-sm">Logout</span>
        </motion.button>
      </nav>

      <div className="p-4 md:p-6 mt-auto border-t border-white/5">
        <Link
          href="/profile"
          title={user.email ? `${displayName} · ${user.email}` : displayName}
          className={cn(
            'flex items-center gap-3 p-3 rounded-2xl transition-colors cursor-pointer select-none',
            pathname.startsWith('/profile')
              ? 'bg-white/10 text-white'
              : 'bg-white/5 hover:bg-white/10 text-white/90'
          )}
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-white/10 shadow-inner shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
                unoptimized={user.avatarUrl.startsWith('blob:')}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#FF9A9E] to-[#FECFEF] text-[#141235] text-sm font-bold">
                {initialsBase}
              </div>
            )}
          </div>
          <div className="hidden md:flex flex-col overflow-hidden min-w-0 flex-1 text-left">
            <span className="font-semibold text-sm text-white truncate">{displayName}</span>
            {user.email ? (
              <span className="text-xs text-white/50 truncate">{user.email}</span>
            ) : (
              <span className="text-xs text-white/45 truncate">Profile</span>
            )}
          </div>
        </Link>
      </div>
    </motion.aside>
    </>
  )
}
