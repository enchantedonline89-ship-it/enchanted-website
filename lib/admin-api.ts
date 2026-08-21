import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type AdminAuthorization =
  | { ok: false; error: NextResponse }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; user: User }

export async function authorizeAdminRequest(request: NextRequest): Promise<AdminAuthorization> {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const configuredEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  if (!configuredEmail) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 }),
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (user.email?.toLowerCase() !== configuredEmail) {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, supabase, user }
}
