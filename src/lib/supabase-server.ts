import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  )
}

type RouteHandlerCookie = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

/**
 * For App Router Route Handlers: use the request’s cookies (same as the browser
 * sent on `fetch` with credentials) and attach any refreshed Supabase auth
 * cookies to the JSON/redirect response.
 */
export function createSupabaseRouteHandlerClient(request: NextRequest): {
  supabase: SupabaseClient
  applySupabaseCookies: (response: NextResponse) => void
} {
  const pending: RouteHandlerCookie[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            pending.push({ name, value, options })
          }
        },
      },
    }
  )

  function applySupabaseCookies(response: NextResponse) {
    for (const { name, value, options } of pending) {
      if (!value) {
        response.cookies.delete(name)
      } else {
        response.cookies.set(name, value, options)
      }
    }
  }

  return { supabase, applySupabaseCookies }
}