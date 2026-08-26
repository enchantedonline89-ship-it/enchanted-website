import type { TransactionalEmailJob } from '@/lib/email/types'

type OutboxRow = {
  id: string
  idempotency_key: string
  template: string
  recipient: string
  payload_json: string
  status: 'pending' | 'queued' | 'failed'
  available_at: string
}

type OutboxStatement = {
  bind(...values: unknown[]): OutboxStatement
  run(): Promise<{ meta: { changes: number } }>
  all<T>(): Promise<{ results: T[] }>
}

type EmailEnvironment = {
  DB: { prepare(sql: string): OutboxStatement }
  EMAIL_QUEUE: { send(job: TransactionalEmailJob): Promise<unknown> }
}

const templates = new Set<TransactionalEmailJob['template']>([
  'verify-email',
  'reset-password',
  'order-received',
  'order-status',
])

function jobFrom(row: OutboxRow): TransactionalEmailJob | null {
  if (!templates.has(row.template as TransactionalEmailJob['template'])) return null
  try {
    const payload: unknown = JSON.parse(row.payload_json)
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
    return {
      idempotencyKey: row.idempotency_key,
      template: row.template as TransactionalEmailJob['template'],
      recipient: row.recipient,
      payload: payload as Record<string, string | number | null>,
    }
  } catch {
    return null
  }
}

async function dispatchRow(env: EmailEnvironment, row: OutboxRow): Promise<boolean> {
  const job = jobFrom(row)
  if (!job) {
    await env.DB.prepare(
      `UPDATE notification_outbox
       SET status = 'failed', attempts = 10, last_error_code = 'INVALID_OUTBOX_JOB', updated_at = ?
       WHERE id = ?`,
    ).bind(new Date().toISOString(), row.id).run()
    return false
  }

  const now = new Date()
  const leaseUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  const claimed = await env.DB.prepare(
    `UPDATE notification_outbox
     SET status = 'queued', available_at = ?, updated_at = ?
     WHERE id = ? AND status = ? AND available_at = ? AND attempts < 10`,
  ).bind(leaseUntil, now.toISOString(), row.id, row.status, row.available_at).run()
  if (claimed.meta.changes !== 1) return false

  try {
    await env.EMAIL_QUEUE.send(job)
    return true
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : 'QUEUE_SEND_FAILED'
    await env.DB.prepare(
      `UPDATE notification_outbox
       SET status = 'failed', last_error_code = ?, available_at = ?, updated_at = ?
       WHERE id = ? AND status = 'queued' AND available_at = ?`,
    ).bind(
      code,
      new Date(now.getTime() + 60 * 1000).toISOString(),
      new Date().toISOString(),
      row.id,
      leaseUntil,
    ).run()
    return false
  }
}

export async function reconcileNotificationOutbox(
  env: EmailEnvironment,
  limit = 100,
  idempotencyKey?: string,
): Promise<number> {
  const now = new Date().toISOString()
  const statement = idempotencyKey
    ? env.DB.prepare(
        `SELECT id, idempotency_key, template, recipient, payload_json, status, available_at
         FROM notification_outbox
         WHERE idempotency_key = ? AND status IN ('pending', 'queued', 'failed')
           AND available_at <= ? AND attempts < 10
         LIMIT 1`,
      ).bind(idempotencyKey, now)
    : env.DB.prepare(
        `SELECT id, idempotency_key, template, recipient, payload_json, status, available_at
         FROM notification_outbox
         WHERE status IN ('pending', 'queued', 'failed')
           AND available_at <= ? AND attempts < 10
         ORDER BY available_at, created_at
         LIMIT ?`,
      ).bind(now, Math.max(1, Math.min(limit, 100)))

  const rows = await statement.all<OutboxRow>()
  let dispatched = 0
  for (const row of rows.results) {
    if (await dispatchRow(env, row)) dispatched += 1
  }
  return dispatched
}

export async function enqueueEmail(
  env: EmailEnvironment,
  job: TransactionalEmailJob,
): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT OR IGNORE INTO notification_outbox
       (id, idempotency_key, order_id, channel, template, recipient, payload_json,
        status, available_at, created_at, updated_at)
     VALUES (?, ?, NULL, 'email', ?, ?, ?, 'pending', ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    job.idempotencyKey,
    job.template,
    job.recipient,
    JSON.stringify(job.payload),
    now,
    now,
    now,
  ).run()
  await reconcileNotificationOutbox(env, 1, job.idempotencyKey)
}
