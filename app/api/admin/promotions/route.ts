import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { createPromotion, PromotionMutationError } from '@/lib/admin-promotions-d1'
import { validatePromotionInput } from '@/lib/promotion-input'

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = validatePromotionInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const promotion = await createPromotion(
      auth.db,
      parsed.value,
      auth.user,
      request.headers.get('cf-ray') ?? request.headers.get('x-request-id'),
    )

    revalidatePath('/', 'layout')
    revalidatePath('/product/[slug]', 'page')
    return NextResponse.json({ promotion }, { status: 201 })
  } catch (error) {
    if (error instanceof PromotionMutationError && error.code === 'CATEGORY_NOT_FOUND') {
      return NextResponse.json({ error: 'Choose an active category for this discount.' }, { status: 400 })
    }
    console.error('Promotion insert failed:', error)
    return NextResponse.json({ error: 'Could not create that event.' }, { status: 500 })
  }
}
