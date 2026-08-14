import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function authorizeAdminRequest(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const configuredEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  if (!configuredEmail) {
    return { error: NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 }) }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (user.email?.toLowerCase() !== configuredEmail) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}
