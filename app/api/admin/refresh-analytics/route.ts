import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

/**
 * POST /api/admin/refresh-analytics
 * Manually triggers a REFRESH MATERIALIZED VIEW CONCURRENTLY on order_analytics.
 * Useful as a fallback if the trigger didn't fire or for on-demand refresh.
 * Requires an authenticated admin session.
 */
export async function POST() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase.rpc('refresh_order_analytics')

  if (error) {
    console.error('Analytics refresh error:', error)
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }

  return NextResponse.json({ refreshed: true })
}
