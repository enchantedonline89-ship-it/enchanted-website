import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { deactivateProduct, isCatalogId, updateProduct, validateProductInput } from '@/lib/admin-catalog'
import { catalogActor, catalogMutationError, catalogTraceId } from '@/lib/admin-catalog-route'

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: Context) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error
  const { id } = await context.params
  if (!isCatalogId(id)) return NextResponse.json({ error: 'Product ID is invalid.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = validateProductInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const product = await updateProduct(
      authorization.db,
      id,
      parsed.value,
      catalogActor(authorization.user),
      catalogTraceId(request),
    )
    revalidatePath('/', 'layout')
    return NextResponse.json({ product })
  } catch (error) {
    return catalogMutationError(error)
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error
  const { id } = await context.params
  if (!isCatalogId(id)) return NextResponse.json({ error: 'Product ID is invalid.' }, { status: 400 })

  try {
    await deactivateProduct(
      authorization.db,
      id,
      catalogActor(authorization.user),
      catalogTraceId(request),
    )
    revalidatePath('/', 'layout')
    return NextResponse.json({ deactivated: true })
  } catch (error) {
    return catalogMutationError(error)
  }
}
