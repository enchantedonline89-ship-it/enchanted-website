import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authorizeAdminRequest } from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error

  const service = await createServiceClient()
  const { data, error } = await service.from('order_analytics').select('*').single()
  if (error) {
    console.error('Admin analytics query error:', error)
    return NextResponse.json({ error: 'Analytics are temporarily unavailable.' }, { status: 503 })
  }

  return NextResponse.json(
    { analytics: data },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
