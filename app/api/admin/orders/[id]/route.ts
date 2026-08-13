import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'

const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// The only email allowed to perform admin operations.
// Set ADMIN_EMAIL in .env.local and Vercel environment variables.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (isSupabaseMockMode()) {
    return NextResponse.json({ success: true })
  }

  // Step 1: Verify authenticated session
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Verify the authenticated user is the admin
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // Step 3: Reject malformed identifiers before they reach Postgres.
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
