import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { MessageSquare, Zap, Shield, Sparkles } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in → go to chat
  if (session) {
    redirect('/chat')
  }

  // If not logged in → show landing page
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="w-full flex items-center justify-between p-6 z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <span>Vambu</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium hover:text-blue-500 transition-colors">
            Sign In
          </Link>
          <Link 
            href="/auth/register" 
            className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-5xl mx-auto pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>The next generation of chat</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Connect with anyone, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            anywhere, anytime.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Experience seamless, real-time communication with a beautifully designed, 
          lightning-fast interface built for modern teams and communities.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <Link 
            href="/auth/register" 
            className="flex-1 bg-blue-600 text-white font-medium py-3 px-8 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            Start Chatting <Zap className="w-4 h-4" />
          </Link>
          <Link 
            href="/auth/login" 
            className="flex-1 bg-card text-card-foreground border border-border font-medium py-3 px-8 rounded-full hover:bg-muted transition-all flex items-center justify-center gap-2"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Messages delivered instantly. Powered by modern edge infrastructure.
            </p>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-500">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Secure & Private</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your data is protected with enterprise-grade security and authentication.
            </p>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 text-green-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Beautiful UI</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Crafted with attention to detail for the best user experience.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}