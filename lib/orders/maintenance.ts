type ExpiringOrder = {
  id: string
  order_number: string
  user_email: string
}

export async function expirePendingOrders(db: D1Database, limit = 100): Promise<number> {
  const now = new Date().toISOString()
  const due = await db.prepare(
    `SELECT id, order_number, user_email
     FROM orders
     WHERE status = 'pending' AND pending_expires_at <= ?
     ORDER BY pending_expires_at
     LIMIT ?`,
  ).bind(now, Math.max(1, Math.min(limit, 100))).all<ExpiringOrder>()

  let expired = 0
  for (const order of due.results) {
    const idempotencyKey = `order-expired:${order.id}`
    const payload = JSON.stringify({
      orderNumber: order.order_number,
      status: 'cancelled because the 24-hour confirmation window expired',
      whatsapp: '+96181492994',
    })
    const results = await db.batch([
      db.prepare(
        `UPDATE orders
         SET status = 'cancelled', cancelled_at = ?, pending_expired_at = ?, updated_at = ?
         WHERE id = ? AND status = 'pending' AND pending_expires_at <= ?`,
      ).bind(now, now, now, order.id, now),
      db.prepare(
        `INSERT INTO order_status_history
           (id, order_id, previous_status, status, actor_user_id, public_note, created_at)
         SELECT ?, id, 'pending', 'cancelled', NULL,
                'Order expired after awaiting confirmation for 24 hours.', ?
         FROM orders WHERE id = ? AND pending_expired_at = ?`,
      ).bind(crypto.randomUUID(), now, order.id, now),
      db.prepare(
        `INSERT INTO notification_outbox
           (id, idempotency_key, order_id, channel, template, recipient, payload_json,
            status, available_at, created_at, updated_at)
         SELECT ?, ?, id, 'email', 'order-status', user_email, ?, 'pending', ?, ?, ?
         FROM orders WHERE id = ? AND pending_expired_at = ?`,
      ).bind(
        crypto.randomUUID(), idempotencyKey, payload, now, now, now, order.id, now,
      ),
      db.prepare(
        `INSERT INTO admin_audit_logs
           (id, admin_user_id, admin_email, action, entity_type, entity_id,
            entity_name, changes_json, created_at)
         SELECT ?, NULL, 'system@enchanted.local', 'AUTO_EXPIRE', 'order', id,
                order_number, ?, ?
         FROM orders WHERE id = ? AND pending_expired_at = ?`,
      ).bind(
        crypto.randomUUID(),
        JSON.stringify({ before: 'pending', after: 'cancelled', reason: '24h_expiry' }),
        now,
        order.id,
        now,
      ),
    ])
    if (results[0].meta.changes === 1) expired += 1
  }
  return expired
}
