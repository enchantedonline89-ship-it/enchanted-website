import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import {
  deletePromotion,
  PromotionMutationError,
  updatePromotion,
} from '@/lib/admin-promotions-d1'
import { validatePromotionInput } from '@/lib/promotion-input'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function refreshStorefront() {
  revalidatePath('/', 'layout')
  revalidatePath('/product/[slug]', 'page')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = validatePromotionInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const promotion = await updatePromotion(
      auth.db,
      id,
      parsed.value,
      auth.user,
      request.headers.get('cf-ray') ?? request.headers.get('x-request-id'),
    )

    refreshStorefront()
    return NextResponse.json({ promotion })
  } catch (error) {
    if (error instanceof PromotionMutationError && error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }
    if (error instanceof PromotionMutationError && error.code === 'CATEGORY_NOT_FOUND') {
      return NextResponse.json({ error: 'Choose an active category for this discount.' }, { status: 400 })
    }
    console.error('Promotion update failed:', error)
    return NextResponse.json({ error: 'Could not update that event.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 })

  try {
    await deletePromotion(
      auth.db,
      id,
      auth.user,
      request.headers.get('cf-ray') ?? request.headers.get('x-request-id'),
    )

    refreshStorefront()
    return NextResponse.json({ deleted: true })
  } catch (error) {
    if (error instanceof PromotionMutationError && error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }
    console.error('Promotion delete failed:', error)
    return NextResponse.json({ error: 'Could not delete that event.' }, { status: 500 })
  }
}
