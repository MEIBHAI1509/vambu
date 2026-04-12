import { redirect } from 'next/navigation'
import { isAppAdmin } from '@/lib/is-app-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!(await isAppAdmin(supabase, user.id))) {
    redirect('/chat')
  }

  return children
}
