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

  let mutation: { status: OrderStatus; extendHours?: never } | { status?: never; extendHours: number }
  try {
    const body = await request.json() as { status?: unknown; extend_hours?: unknown }
    if (typeof body.status === 'string' && body.status in NEXT && body.extend_hours === undefined) {
      mutation = { status: body.status as OrderStatus }
    } else if (
      body.status === undefined &&
      Number.isInteger(body.extend_hours) &&
      Number(body.extend_hours) >= 1 &&
      Number(body.extend_hours) <= 168
    ) {
      mutation = { extendHours: Number(body.extend_hours) }
    } else {
      throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: 'Choose a valid order status or extend pending confirmation by 1 to 168 hours.' },
      { status: 400 },
    )
  }

  const { id } = await params
  const order = await authorization.db.prepare(
    `SELECT id, order_number, status, user_email, pending_expires_at
     FROM orders WHERE id = ?`,
  ).bind(id).first<{
    id: string
    order_number: string
    status: OrderStatus
    user_email: string
    pending_expires_at: string | null
  }>()
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  if (mutation.extendHours !== undefined) {
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only an unconfirmed order can be extended.' }, { status: 409 })
    }
    const now = new Date()
    const currentExpiry = Date.parse(order.pending_expires_at ?? '')
    const extendedUntil = new Date(
      Math.max(now.getTime(), Number.isFinite(currentExpiry) ? currentExpiry : 0)
        + mutation.extendHours * 60 * 60 * 1000,
    ).toISOString()
    const extensionToken = crypto.randomUUID()
    const results = await authorization.db.batch([
      authorization.db.prepare(
        `UPDATE orders
         SET pending_expires_at = ?, pending_extension_token = ?, updated_at = ?
         WHERE id = ? AND status = 'pending' AND pending_expires_at IS ?`,
      ).bind(extendedUntil, extensionToken, now.toISOString(), order.id, order.pending_expires_at),
      authorization.db.prepare(
        `INSERT INTO admin_audit_logs
           (id, admin_user_id, admin_email, action, entity_type, entity_id,
            entity_name, changes_json, created_at)
         SELECT ?, ?, ?, 'EXTEND_CONFIRMATION', 'order', id, order_number, ?, ?
         FROM orders
         WHERE id = ? AND status = 'pending' AND pending_extension_token = ?`,
      ).bind(
        crypto.randomUUID(), authorization.user.id, authorization.user.email,
        JSON.stringify({ before: order.pending_expires_at, after: extendedUntil }),
        now.toISOString(), order.id, extensionToken,
      ),
    ])
    if (results[0].meta.changes !== 1) {
      return NextResponse.json({ error: 'The order changed before it could be extended.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, pending_expires_at: extendedUntil })
  }

  const status = mutation.status
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
    const results = await authorization.db.batch([
      authorization.db.prepare(
        `UPDATE orders
         SET status = ?, ${timestampColumn} = ?, updated_at = ?
         WHERE id = ? AND status = ?`,
      ).bind(status, now, now, order.id, order.status),
      authorization.db.prepare(
        `INSERT INTO order_status_history
           (id, order_id, previous_status, status, actor_user_id, public_note, created_at)
         SELECT ?, id, ?, ?, ?, ?, ?
         FROM orders WHERE id = ? AND status = ? AND updated_at = ?`,
      ).bind(
        crypto.randomUUID(), order.status, status, authorization.user.id,
        `Order is ${STATUS_LABEL[status]}.`, now, order.id, status, now,
      ),
      authorization.db.prepare(
        `INSERT INTO notification_outbox
           (id, idempotency_key, order_id, channel, template, recipient, payload_json,
            status, available_at, created_at, updated_at)
         SELECT ?, ?, id, 'email', 'order-status', user_email, ?, 'pending', ?, ?, ?
         FROM orders WHERE id = ? AND status = ? AND updated_at = ?`,
      ).bind(
        crypto.randomUUID(), idempotencyKey, payload, now, now, now,
        order.id, status, now,
      ),
      authorization.db.prepare(
        `INSERT INTO admin_audit_logs
           (id, admin_user_id, admin_email, action, entity_type, entity_id,
            entity_name, changes_json, created_at)
         SELECT ?, ?, ?, 'UPDATE_STATUS', 'order', id, order_number, ?, ?
         FROM orders WHERE id = ? AND status = ? AND updated_at = ?`,
      ).bind(
        crypto.randomUUID(), authorization.user.id, authorization.user.email,
        JSON.stringify({ before: order.status, after: status }), now,
        order.id, status, now,
      ),
    ])
    if (results[0].meta.changes !== 1) {
      return NextResponse.json({ error: 'The order status changed. Refresh and try again.' }, { status: 409 })
    }

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
      }).catch((error) => console.error('Order status email dispatch failed', error))
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
