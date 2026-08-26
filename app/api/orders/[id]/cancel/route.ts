import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { enqueueEmail } from '@/lib/email/queue'

type CustomerOrder = {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  user_email: string
}

const cancellable = new Set<CustomerOrder['status']>([
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [auth, db, env] = await Promise.all([getAuth(), getD1Database(), getCloudflareEnv()])
    if (!db || !env) throw new Error('bindings-unavailable')
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to cancel an order.' }, { status: 401 })
    }

    const { id } = await params
    const order = await db.prepare(
      `SELECT id, order_number, status, user_email
       FROM orders WHERE id = ? AND user_id = ?`,
    ).bind(id, session.user.id).first<CustomerOrder>()
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.status === 'cancelled') {
      return NextResponse.json({ success: true, status: 'cancelled', already_cancelled: true })
    }
    if (!cancellable.has(order.status)) {
      return NextResponse.json({ error: 'A delivered order can no longer be cancelled.' }, { status: 409 })
    }

    const now = new Date().toISOString()
    const idempotencyKey = `order-status:${order.id}:cancelled`
    const payload = JSON.stringify({
      orderNumber: order.order_number,
      status: 'cancelled',
      whatsapp: '+96181492994',
    })
    const results = await db.batch([
      db.prepare(
        `UPDATE orders
         SET status = 'cancelled', cancelled_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND status = ?`,
      ).bind(now, now, order.id, session.user.id, order.status),
      db.prepare(
        `INSERT INTO order_status_history
           (id, order_id, previous_status, status, actor_user_id, public_note, created_at)
         SELECT ?, id, ?, 'cancelled', ?, 'Order was cancelled by the customer.', ?
         FROM orders
         WHERE id = ? AND user_id = ? AND status = 'cancelled' AND updated_at = ?`,
      ).bind(
        crypto.randomUUID(), order.status, session.user.id, now,
        order.id, session.user.id, now,
      ),
      db.prepare(
        `INSERT INTO notification_outbox
           (id, idempotency_key, order_id, channel, template, recipient, payload_json,
            status, available_at, created_at, updated_at)
         SELECT ?, ?, id, 'email', 'order-status', user_email, ?, 'pending', ?, ?, ?
         FROM orders
         WHERE id = ? AND user_id = ? AND status = 'cancelled' AND updated_at = ?`,
      ).bind(
        crypto.randomUUID(), idempotencyKey, payload, now, now, now,
        order.id, session.user.id, now,
      ),
    ])

    if (results[0].meta.changes !== 1) {
      const current = await db.prepare(
        'SELECT status FROM orders WHERE id = ? AND user_id = ?',
      ).bind(order.id, session.user.id).first<{ status: CustomerOrder['status'] }>()
      if (current?.status === 'cancelled') {
        return NextResponse.json({ success: true, status: 'cancelled', already_cancelled: true })
      }
      return NextResponse.json({ error: 'The order changed. Refresh and try again.' }, { status: 409 })
    }

    await enqueueEmail(env, {
      idempotencyKey,
      template: 'order-status',
      recipient: order.user_email,
      payload: {
        orderNumber: order.order_number,
        status: 'cancelled',
        whatsapp: '+96181492994',
      },
    }).catch((error) => console.error('Cancellation email dispatch failed', error))

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (error) {
    console.error('Customer order cancellation failed', error)
    return NextResponse.json({ error: 'The order could not be cancelled.' }, { status: 503 })
  }
}
