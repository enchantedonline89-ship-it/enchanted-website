import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'

async function handle(request: Request) {
  try {
    return await (await getAuth()).handler(request)
  } catch (error) {
    console.error('Authentication service unavailable', error)
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable.' },
      { status: 503 },
    )
  }
}

export const GET = handle
export const POST = handle
