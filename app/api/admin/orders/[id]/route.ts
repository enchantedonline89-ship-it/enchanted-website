import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'

const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (isSupabaseMockMode()) {
    return NextResponse.json({ success: true })
  }

  // Verify authenticated session
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
