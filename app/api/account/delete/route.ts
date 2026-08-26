import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { readBoundedJsonObject, RequestBodyTooLargeError } from '@/lib/request-body'

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  let confirmation = ''
  try {
    const body = await readBoundedJsonObject(request, 1024)
    confirmation = typeof body.confirm === 'string' ? body.confirm : ''
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 })
    }
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 })
  }
  if (confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 })
  }

  try {
    const [auth, db] = await Promise.all([getAuth(), getD1Database()])
    if (!db) throw new Error('database-unavailable')
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role === 'admin') {
      return NextResponse.json({ error: 'The owner account cannot be deleted here.' }, { status: 403 })
    }

    const open = await db.prepare(
      `SELECT count(*) AS count FROM orders
       WHERE user_id = ? AND status IN ('pending','confirmed','preparing','out_for_delivery')`,
    ).bind(session.user.id).first<{ count: number }>()
    if ((open?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Your account has an open order. Delete it after the order is delivered or cancelled.' },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()
    const anonymousEmail = `deleted+${await shortHash(`${session.user.id}:${session.user.email}`)}@privacy.invalid`
    await db.batch([
      db.prepare(
        `UPDATE orders SET
           user_id = NULL, user_email = ?, recipient_name = 'Deleted customer',
           phone_e164 = '+9610000000', governorate = 'Deleted', city = 'Deleted',
           area = 'Deleted', street = 'Deleted', building = NULL, floor = NULL,
           landmark = NULL, delivery_notes = NULL, order_notes = NULL, updated_at = ?
         WHERE user_id = ?`,
      ).bind(anonymousEmail, now, session.user.id),
      db.prepare('DELETE FROM "user" WHERE id = ? AND role = \'customer\'').bind(session.user.id),
    ])
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Account deletion failed', error)
    return NextResponse.json({ error: 'We could not delete the account. Contact support.' }, { status: 503 })
  }
}
