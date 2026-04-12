'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { STORAGE_URL } from '@/utils/common'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/chat')
      router.refresh()
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Could not create an account. Please try again or sign in if you already have one.')
      setLoading(false)
      return
    }

    const identities = data.user.identities ?? []
    if (identities.length === 0) {
      setError('existing_account')
      setLoading(false)
      return
    }

    setMessage('Check your email and confirm your account.')
    setLoading(false)
  }

  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during Google registration.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-zinc-950/80 text-zinc-100 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 logo-container overflow-hidden relative shadow-inner ring-1 ring-white/20">
            <Image src={`${STORAGE_URL}/logo/vambu-logo.png`} alt="Vambu Logo" fill sizes="64px" className="object-contain drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Create Account</h1>
          <p className="text-zinc-400 text-sm text-center">
            Join Vambu and start chatting instantly
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-zinc-300">
              Email
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white shadow-inner transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent"
            />
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none text-zinc-300">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="flex h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white shadow-inner transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && error !== 'existing_account' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-sm text-red-400 font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20"
            >
              {error}
            </motion.div>
          )}

          {error === 'existing_account' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-sm text-amber-200 font-medium bg-amber-500/10 p-3 rounded-lg border border-amber-500/25 space-y-2"
            >
              <p>An account with this email already exists. Sign in with your password on the login page.</p>
              <Link
                href="/auth/login"
                className="inline-block text-indigo-400 hover:text-indigo-300 underline font-semibold"
              >
                Go to Sign in
              </Link>
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-sm text-emerald-400 font-medium bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20"
            >
              {message}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 hover:shadow-indigo-500/25 h-12 px-4 py-2 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-3 text-zinc-500 font-medium tracking-wider">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleRegister}
          type="button"
          className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 border border-white/10 bg-white/5 shadow-sm hover:bg-white/10 h-12 px-4 py-2 text-white"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}