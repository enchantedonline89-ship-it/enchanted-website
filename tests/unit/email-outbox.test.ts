// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { enqueueEmail } from '@/lib/email/queue'

function environment(send = vi.fn(async () => {})) {
  const statements: Array<{ sql: string; bindings: unknown[] }> = []
  const row = {
    id: 'outbox-1',
    idempotency_key: 'verify-email:user:token',
    template: 'verify-email',
    recipient: 'buyer@example.com',
    payload_json: JSON.stringify({ name: 'Buyer', url: 'https://shop.example/verify' }),
    status: 'pending' as const,
    available_at: '2026-08-26T00:00:00.000Z',
  }
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        bindings: [] as unknown[],
        bind(...values: unknown[]) {
          statement.bindings = values
          return statement
        },
        async run() {
          return { success: true, results: [], meta: { changes: 1 } }
        },
        async all<T>() {
          return { success: true, results: [row as T], meta: {} }
        },
      }
      statements.push(statement)
      return statement
    },
  }
  return {
    env: {
      DB: db,
      EMAIL_QUEUE: { send },
    },
    send,
    statements,
  }
}

describe('durable email outbox', () => {
  it('persists the job before claiming and sending it to Queues', async () => {
    const h = environment()
    await enqueueEmail(h.env, {
      idempotencyKey: 'verify-email:user:token',
      template: 'verify-email',
      recipient: 'buyer@example.com',
      payload: { name: 'Buyer', url: 'https://shop.example/verify' },
    })

    expect(h.statements[0].sql).toMatch(/INSERT OR IGNORE INTO notification_outbox/i)
    expect(h.statements.some((statement) => /SET status = 'queued'/i.test(statement.sql))).toBe(true)
    expect(h.send).toHaveBeenCalledTimes(1)
  })

  it('keeps a failed Queue submission recoverable in D1', async () => {
    const send = vi.fn(async () => { throw new Error('queue unavailable') })
    const h = environment(send)

    await expect(enqueueEmail(h.env, {
      idempotencyKey: 'verify-email:user:token',
      template: 'verify-email',
      recipient: 'buyer@example.com',
      payload: { name: 'Buyer', url: 'https://shop.example/verify' },
    })).resolves.toBeUndefined()

    expect(h.statements.some((statement) => /SET status = 'failed'/i.test(statement.sql))).toBe(true)
  })
})
