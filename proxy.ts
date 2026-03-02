import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// The only email allowed to access /admin/* routes.
// Set ADMIN_EMAIL in .env.local and Vercel environment variables.
// This is a defence-in-depth check at the edge — the API routes also verify this.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export async function proxy(request: NextRequest) {
  // Skip in mock mode — no real Supabase to auth against
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isMock = !supabaseUrl || supabaseUrl.includes('your_supabase') || !supabaseUrl.startsWith('https://')
  if (isMock) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Protect /admin/* except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
    // Even if authenticated, verify it is the admin account
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in admin away from /admin/login
  if (pathname === '/admin/login' && user) {
    // Only redirect if it is actually the admin email
    if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Protect /orders/*
  if (pathname.startsWith('/orders')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', '1')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/orders/:path*'],
}
