import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { validatePromotionInput } from '@/lib/promotion-input'

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const parsed = validatePromotionInput(body)
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('promotions')
    .insert(parsed.value)
    .select('*')
    .single()
  if (error) {
    console.error('Promotion insert failed:', error)
    return NextResponse.json({ error: 'Could not create that event.' }, { status: 500 })
  }

  const { error: auditError } = await auth.supabase.from('admin_logs').insert({
    admin_email: auth.user.email ?? 'unknown',
    action: 'CREATE',
    entity_type: 'promotion',
    entity_id: data.id,
    entity_name: data.name,
    changes: { before: null, after: data },
  })
  if (auditError) console.error('Promotion audit insert failed:', auditError)

  revalidatePath('/', 'layout')
  revalidatePath('/product/[slug]', 'page')
  return NextResponse.json({ promotion: data }, { status: 201 })
}
