import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import {
  CustomerDataError,
  isSameOriginMutation,
  parseCustomerAddressInput,
  readBoundedJsonObject,
  softDeleteCustomerAddress,
  updateCustomerAddress,
} from '@/lib/customer-data'

const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function errorResponse(error: unknown) {
  if (error instanceof CustomerDataError) {
    return NextResponse.json(
      { error: error.message, code: error.code, fieldErrors: error.fieldErrors },
      { status: error.status, headers: NO_STORE },
    )
  }
  console.error({ event: 'customer_address_api_failed', errorType: error instanceof Error ? error.name : typeof error })
  return NextResponse.json(
    { error: 'Your address could not be updated. Please try again.' },
    { status: 500, headers: NO_STORE },
  )
}

type RequestContext =
  | { userId: string; db: D1Database }
  | { error: NextResponse }

async function requestContext(request: NextRequest): Promise<RequestContext> {
  try {
    const session = await (await getAuth()).api.getSession({ headers: request.headers })
    if (!session?.user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE }) }
    }
    const db = await getD1Database()
    if (!db) {
      return {
        error: NextResponse.json(
          { error: 'Address storage is temporarily unavailable.' },
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

async function routeContext(
  request: NextRequest,
  params: Promise<{ id: string }>,
): Promise<({ userId: string; db: D1Database; id: string } | { error: NextResponse })> {
  if (!isSameOriginMutation(request)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE }) }
  }
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return { error: NextResponse.json({ error: 'Invalid address ID.' }, { status: 400, headers: NO_STORE }) }
  }
  const authContext = await requestContext(request)
  if ('error' in authContext) return authContext
  return { ...authContext, id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await routeContext(request, params)
  if ('error' in context) return context.error

  try {
    const input = parseCustomerAddressInput(await readBoundedJsonObject(request))
    const address = await updateCustomerAddress(context.db, context.userId, context.id, input)
    return NextResponse.json({ address }, { headers: NO_STORE })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await routeContext(request, params)
  if ('error' in context) return context.error

  try {
    const result = await softDeleteCustomerAddress(context.db, context.userId, context.id)
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (error) {
    return errorResponse(error)
  }
}
