import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
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
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: before, error: readError } = await auth.supabase
    .from('promotions').select('*').eq('id', id).single()
  if (readError || !before) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

  const { data, error } = await auth.supabase
    .from('promotions').update(parsed.value).eq('id', id).select('*').single()
  if (error) {
    console.error('Promotion update failed:', error)
    return NextResponse.json({ error: 'Could not update that event.' }, { status: 500 })
  }

  const { error: auditError } = await auth.supabase.from('admin_logs').insert({
    admin_email: auth.user.email ?? 'unknown',
    action: 'UPDATE',
    entity_type: 'promotion',
    entity_id: data.id,
    entity_name: data.name,
    changes: { before, after: data },
  })
  if (auditError) console.error('Promotion audit insert failed:', auditError)

  refreshStorefront()
  return NextResponse.json({
    promotion: data,
    ...(auditError
      ? { warning: 'The campaign was updated, but its audit entry failed. Please contact support.' }
      : {}),
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 })

  const { data: before, error: readError } = await auth.supabase
    .from('promotions').select('*').eq('id', id).single()
  if (readError || !before) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

  const { error } = await auth.supabase.from('promotions').delete().eq('id', id)
  if (error) {
    console.error('Promotion delete failed:', error)
    return NextResponse.json({ error: 'Could not delete that event.' }, { status: 500 })
  }

  const { error: auditError } = await auth.supabase.from('admin_logs').insert({
    admin_email: auth.user.email ?? 'unknown',
    action: 'DELETE',
    entity_type: 'promotion',
    entity_id: before.id,
    entity_name: before.name,
    changes: { before, after: null },
  })
  if (auditError) console.error('Promotion audit insert failed:', auditError)

  refreshStorefront()
  return NextResponse.json({
    deleted: true,
    ...(auditError
      ? { warning: 'The campaign was deleted, but its audit entry failed. Please contact support.' }
      : {}),
  })
}
