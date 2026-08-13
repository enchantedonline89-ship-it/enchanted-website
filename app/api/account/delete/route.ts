import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── Rate limiting: 1 deletion per 10 minutes per IP ─────────────────────────
const WINDOW_MS = 10 * 60_000
const deleteHits = new Map<string, number>()

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [ip, ts] of deleteHits) {
    if (ts < cutoff) deleteHits.delete(ip)
  }
}, 5 * 60_000)

function isRateLimited(ip: string): boolean {
  const last = deleteHits.get(ip)
  if (last && Date.now() - last < WINDOW_MS) return true
  deleteHits.set(ip, Date.now())
  return false
}

export async function DELETE(request: NextRequest) {
  // Rate limit
  const realIp = request.headers.get('x-real-ip')
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = realIp ?? (forwarded ? forwarded.split(',').at(-1)!.trim() : 'unknown')
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  // getUser() revalidates the JWT against the auth server. getSession() must NOT be
  // used here: on the server it reads the user straight out of the auth cookie, which
  // @supabase/ssr stores as unsigned base64url JSON, so a forged cookie would let any
  // caller delete an arbitrary account.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prevent admin from accidentally deleting their own account via this route
  if (user.email?.toLowerCase() === (process.env.ADMIN_EMAIL ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'Admin account cannot be deleted via this endpoint.' }, { status: 403 })
  }

  const service = await createServiceClient()

  // Delete user's orders
  const { error: orderDeleteError } = await service.from('orders').delete().eq('user_id', user.id)
  if (orderDeleteError) {
    return NextResponse.json(
      { error: 'Failed to remove your order data. Your account was not deleted.' },
      { status: 500 },
    )
  }

  // Delete the user account
  const { error: deleteError } = await service.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
