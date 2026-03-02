import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'

const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled']

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

  // Step 3: Validate id is a non-empty string (basic UUID shape check)
  if (!id || typeof id !== 'string' || id.length > 64) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: body.status })
    .eq('id', id)

  if (error) {
    console.error('Order status update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
