import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { enqueueEmail } from '@/lib/email/queue'
import { rebuildRecommendationModel } from '@/lib/recommendations'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const TIMESTAMP_COLUMN: Partial<Record<OrderStatus, string>> = {
  confirmed: 'confirmed_at',
  preparing: 'preparing_at',
  out_for_delivery: 'out_for_delivery_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'awaiting confirmation',
  confirmed: 'confirmed',
  preparing: 'being prepared',
  out_for_delivery: 'out for delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error

  let status: OrderStatus
  try {
    const body = await request.json() as { status?: unknown }
    if (typeof body.status !== 'string' || !(body.status in NEXT)) throw new Error()
    status = body.status as OrderStatus
  } catch {
    return NextResponse.json({ error: 'Choose a valid order status.' }, { status: 400 })
  }

  const { id } = await params
  const order = await authorization.db.prepare(
    'SELECT id, order_number, status, user_email FROM orders WHERE id = ?',
  ).bind(id).first<{
    id: string
    order_number: string
    status: OrderStatus
    user_email: string
  }>()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (!NEXT[order.status].includes(status)) {
    return NextResponse.json(
      { error: `An order cannot move from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[status]}.` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const idempotencyKey = `order-status:${order.id}:${status}`
  const payload = JSON.stringify({
    orderNumber: order.order_number,
    status: STATUS_LABEL[status],
    whatsapp: '+96181492994',
  })
  const timestampColumn = TIMESTAMP_COLUMN[status]
  if (!timestampColumn) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })

  try {
    await authorization.db.batch([
      authorization.db.prepare(
        `UPDATE orders
         SET status = ?, ${timestampColumn} = ?, updated_at = ?
         WHERE id = ? AND status = ?`,
      ).bind(status, now, now, order.id, order.status),
      authorization.db.prepare(
        `INSERT INTO order_status_history
           (id, order_id, previous_status, status, actor_user_id, public_note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), order.id, order.status, status, authorization.user.id,
        `Order is ${STATUS_LABEL[status]}.`, now,
      ),
      authorization.db.prepare(
        `INSERT INTO notification_outbox
           (id, idempotency_key, order_id, channel, template, recipient, payload_json,
            status, available_at, created_at, updated_at)
         VALUES (?, ?, ?, 'email', 'order-status', ?, ?, 'pending', ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), idempotencyKey, order.id, order.user_email,
        payload, now, now, now,
      ),
      authorization.db.prepare(
        `INSERT INTO admin_audit_logs
           (id, admin_user_id, admin_email, action, entity_type, entity_id,
            entity_name, changes_json, created_at)
         VALUES (?, ?, ?, 'UPDATE_STATUS', 'order', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), authorization.user.id, authorization.user.email,
        order.id, order.order_number,
        JSON.stringify({ before: order.status, after: status }), now,
      ),
    ])

    const env = await getCloudflareEnv()
    if (env) {
      await enqueueEmail(env, {
        idempotencyKey,
        template: 'order-status',
        recipient: order.user_email,
        payload: {
          orderNumber: order.order_number,
          status: STATUS_LABEL[status],
          whatsapp: '+96181492994',
        },
      }).then(
        () => authorization.db.prepare(
          `UPDATE notification_outbox SET status = 'queued', updated_at = ?
           WHERE idempotency_key = ?`,
        ).bind(new Date().toISOString(), idempotencyKey).run(),
        (error) => console.error('Order status email enqueue failed', error),
      )
    }
    if (status === 'delivered') {
      await rebuildRecommendationModel(authorization.db).catch((error) => {
        console.error('Recommendation model rebuild failed', error)
      })
    }
    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Order status update failed', error)
    return NextResponse.json({ error: 'The order could not be updated.' }, { status: 409 })
  }
}
