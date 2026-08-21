import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { getDashboardAnalytics, getExternalAnalytics } from '@/lib/admin-analytics'

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error
  const env = await getCloudflareEnv()
  if (!env) return NextResponse.json({ error: 'Analytics unavailable.' }, { status: 503 })

  const [commerce, technical] = await Promise.all([
    getDashboardAnalytics(authorization.db),
    getExternalAnalytics(env),
  ])
  return NextResponse.json(
    { commerce, technical },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
