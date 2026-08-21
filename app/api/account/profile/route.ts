import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import {
  CustomerDataError,
  getCustomerProfile,
  isSameOriginMutation,
  parseCustomerProfileInput,
  readBoundedJsonObject,
  updateCustomerProfile,
} from '@/lib/customer-data'

const NO_STORE = { 'Cache-Control': 'no-store' }

function errorResponse(error: unknown) {
  if (error instanceof CustomerDataError) {
    return NextResponse.json(
      { error: error.message, code: error.code, fieldErrors: error.fieldErrors },
      { status: error.status, headers: NO_STORE },
    )
  }
  console.error({ event: 'customer_profile_api_failed', errorType: error instanceof Error ? error.name : typeof error })
  return NextResponse.json(
    { error: 'Your account could not be updated. Please try again.' },
    { status: 500, headers: NO_STORE },
  )
}

async function requestContext(request: NextRequest) {
  try {
    const session = await (await getAuth()).api.getSession({ headers: request.headers })
    if (!session?.user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE }) }
    }
    const db = await getD1Database()
    if (!db) {
      return {
        error: NextResponse.json(
          { error: 'Account storage is temporarily unavailable.' },
          { status: 503, headers: NO_STORE },
        ),
      }
    }
    return { userId: session.user.id, db }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Authentication is temporarily unavailable.' },
        { status: 503, headers: NO_STORE },
      ),
    }
  }
}

export async function GET(request: NextRequest) {
  const context = await requestContext(request)
  if ('error' in context) return context.error

  try {
    const profile = await getCustomerProfile(context.db, context.userId)
    return NextResponse.json({ profile }, { headers: NO_STORE })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE })
  }

  const context = await requestContext(request)
  if ('error' in context) return context.error

  try {
    const input = parseCustomerProfileInput(await readBoundedJsonObject(request))
    const profile = await updateCustomerProfile(context.db, context.userId, input)
    return NextResponse.json({ profile }, { headers: NO_STORE })
  } catch (error) {
    return errorResponse(error)
  }
}
