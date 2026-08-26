import { NextResponse } from 'next/server'
import { getCloudflareEnv } from '@/lib/cloudflare/env'

export async function GET() {
  const env = await getCloudflareEnv()
  return NextResponse.json({
    google: Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET),
  })
}
