import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: use getUser instead of getSession
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  const protectedPrefixes = [
    '/chat',
    '/profile',
    '/admin',
    '/groups',
    '/favourites',
    '/calendar',
    '/ai-chat',
    '/files',
    '/settings',
  ] as const

  const isProtected = protectedPrefixes.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))

  if (!user && isProtected) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/chat/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/groups/:path*',
    '/favourites/:path*',
    '/calendar/:path*',
    '/ai-chat/:path*',
    '/files/:path*',
    '/settings/:path*',
  ],
}