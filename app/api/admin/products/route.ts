import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { createProduct, validateProductInput } from '@/lib/admin-catalog'
import { catalogActor, catalogMutationError, catalogTraceId } from '@/lib/admin-catalog-route'

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = validateProductInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const product = await createProduct(
      authorization.db,
      parsed.value,
      catalogActor(authorization.user),
      catalogTraceId(request),
    )
    revalidatePath('/', 'layout')
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    return catalogMutationError(error)
  }
}
