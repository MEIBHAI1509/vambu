import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function AuthCallback({
  searchParams
}: {
  searchParams: { code?: string }
}) {

  const code = searchParams.code

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  redirect('/chat')
}