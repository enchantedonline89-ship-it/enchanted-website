// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

const h = vi.hoisted(() => {
  const state = { status: 'preparing' as OrderStatus, changes: 1 }
  const statements: Array<{ sql: string; bindings: unknown[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        sql,
        bindings: [] as unknown[],
        bind(...values: unknown[]) {
          statement.bindings = values
          return statement
        },
        async first<T>() {
          if (/SELECT status FROM orders/i.test(sql)) return { status: state.status } as T
          return {
            id: 'order-1',
            order_number: 'ES-2608-000001',
            status: state.status,
            user_email: 'buyer@example.com',
          } as T
        },
      }
      statements.push(statement)
      return statement
    }),
    batch: vi.fn(async (batch: typeof statements) => batch.map((_, index) => ({
      success: true,
      results: [],
      meta: { changes: index === 0 ? state.changes : 1 },
    }))),
  }
  return { db, state, statements, enqueueEmail: vi.fn() }
})

vi.mock('@/lib/auth/server', () => ({
  getAuth: vi.fn(async () => ({
    api: { getSession: vi.fn(async () => ({ user: { id: 'buyer-1' } })) },
  })),
}))
vi.mock('@/lib/cloudflare/d1', () => ({ getD1Database: vi.fn(async () => h.db) }))
vi.mock('@/lib/cloudflare/env', () => ({ getCloudflareEnv: vi.fn(async () => ({ DB: h.db })) }))
vi.mock('@/lib/email/queue', () => ({ enqueueEmail: h.enqueueEmail }))

const { POST } = await import('@/app/api/orders/[id]/cancel/route')

function request(origin = 'https://shop.example') {
  return new NextRequest('https://shop.example/api/orders/order-1/cancel', {
    method: 'POST',
    headers: { origin },
  })
}

beforeEach(() => {
  h.state.status = 'preparing'
  h.state.changes = 1
  h.statements.splice(0)
  h.db.prepare.mockClear()
  h.db.batch.mockClear()
  h.enqueueEmail.mockReset()
  h.enqueueEmail.mockResolvedValue(undefined)
})

describe('customer order cancellation', () => {
  it('atomically cancels the caller-owned order before delivery', async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: 'order-1' }) })

    expect(response.status).toBe(200)
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch).toHaveLength(3)
    expect(batch[0].sql).toMatch(/user_id = \? AND status = \?/i)
    expect(batch[1].sql).toMatch(/cancelled by the customer/i)
    expect(batch[2].sql).toMatch(/notification_outbox/i)
    expect(h.enqueueEmail).toHaveBeenCalledTimes(1)
  })

  it('rejects cancellation after delivery without writing', async () => {
    h.state.status = 'delivered'
    const response = await POST(request(), { params: Promise.resolve({ id: 'order-1' }) })

    expect(response.status).toBe(409)
    expect(h.db.batch).not.toHaveBeenCalled()
  })

  it('rejects a cross-site request before authentication or D1 writes', async () => {
    const response = await POST(request('https://attacker.example'), {
      params: Promise.resolve({ id: 'order-1' }),
    })

    expect(response.status).toBe(403)
    expect(h.db.prepare).not.toHaveBeenCalled()
  })
})
