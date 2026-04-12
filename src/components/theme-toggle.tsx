'use client'

import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className={cn('h-10 w-full rounded-2xl bg-white/5 animate-pulse', className)} aria-hidden />
    )
  }

  return (
    <div
      className={cn(
        'flex rounded-2xl border border-white/10 bg-white/5 p-1 gap-0.5',
        className
      )}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors',
          theme === 'light'
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-white/45 hover:text-white/75'
        )}
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors',
          theme === 'dark'
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-white/45 hover:text-white/75'
        )}
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Dark</span>
      </button>
    </div>
  )
}
