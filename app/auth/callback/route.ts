import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only same-origin relative paths. An unconstrained `next` lets `?next=@evil.com`
  // resolve `${origin}${next}` to https://enchanted.style@evil.com, where the brand
  // becomes userinfo and evil.com becomes the host: an open redirect off a trusted
  // origin, immediately after the session cookie is set.
  const rawNext = searchParams.get('next') ?? '/'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase()
      if (adminEmail && user?.email?.toLowerCase() === adminEmail) {
        return NextResponse.redirect(`${origin}/admin/dashboard`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
