import { NextResponse } from 'next/server'
import type { AdminActor } from '@/lib/admin-catalog'
import { CatalogMutationError } from '@/lib/admin-catalog'

export function catalogActor(user: { id: string; email: string }): AdminActor {
  return { id: user.id, email: user.email }
}

export function catalogTraceId(request: Request): string | null {
  return request.headers.get('cf-ray') ?? request.headers.get('x-request-id')
}

export function catalogMutationError(error: unknown): NextResponse {
  if (error instanceof CatalogMutationError) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Catalog item not found.' }, { status: 404 })
    }
    if (error.code === 'CONFLICT') {
      return NextResponse.json({ error: 'That name, slug, or SKU is already in use.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Choose an existing category.' }, { status: 400 })
  }

  console.error('Admin catalog mutation failed.', error)
  return NextResponse.json({ error: 'The catalog change could not be saved.' }, { status: 500 })
}
