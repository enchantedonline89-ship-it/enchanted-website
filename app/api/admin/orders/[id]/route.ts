import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'
import { authorizeAdminRequest } from '@/lib/admin-api'

const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (isSupabaseMockMode()) {
    return NextResponse.json({ error: 'Changes are disabled in preview mode.' }, { status: 503 })
  }

  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // Reject malformed identifiers before they reach Postgres.
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update({ status: body.status })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Order status update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  if (!updatedOrder) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
