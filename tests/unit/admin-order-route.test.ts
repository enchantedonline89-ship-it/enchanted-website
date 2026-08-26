// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Statement = {
  sql: string
  bindings: unknown[]
  bind: (...values: unknown[]) => Statement
  first: <T>() => Promise<T | null>
}

const h = vi.hoisted(() => {
  const statements: Statement[] = []
  const order = {
    id: 'order-1',
    order_number: 'ES-2608-000001',
    status: 'pending',
    user_email: 'buyer@example.com',
    pending_expires_at: '2026-08-26T20:00:00.000Z',
  }
  const state = { updateChanges: 1 }
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement: Statement = {
        sql,
        bindings: [],
        bind(...values: unknown[]) {
          statement.bindings = values
          return statement
        },
        async first<T>() {
          return order as T
        },
      }
      statements.push(statement)
      return statement
    }),
    batch: vi.fn(async (batch: Statement[]) => batch.map((_, index) => ({
      success: true,
      results: [],
      meta: { changes: index === 0 ? state.updateChanges : 1 },
    }))),
  }
  return { db, order, state, statements }
})

vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: vi.fn(async () => ({
    ok: true,
    db: h.db,
    user: {
      id: 'owner-1',
      email: 'owner@example.com',
      name: 'Owner',
      role: 'admin',
      adminRole: 'owner',
    },
  })),
}))
vi.mock('@/lib/cloudflare/env', () => ({ getCloudflareEnv: vi.fn(async () => null) }))
vi.mock('@/lib/email/queue', () => ({ enqueueEmail: vi.fn() }))
vi.mock('@/lib/recommendations', () => ({ rebuildRecommendationModel: vi.fn() }))

const { PATCH } = await import('@/app/api/admin/orders/[id]/route')

function request(body: Record<string, unknown>) {
  return new NextRequest('https://shop.example/api/admin/orders/order-1', {
    method: 'PATCH',
    headers: { origin: 'https://shop.example', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.state.updateChanges = 1
  h.order.status = 'pending'
  h.statements.splice(0)
  h.db.prepare.mockClear()
  h.db.batch.mockClear()
})

describe('admin order integrity', () => {
  it('conditions history, notification, and audit inserts on the successful transition', async () => {
    const response = await PATCH(request({ status: 'confirmed' }), {
      params: Promise.resolve({ id: 'order-1' }),
    })

    expect(response.status).toBe(200)
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch).toHaveLength(4)
    for (const statement of batch.slice(1)) {
      expect(statement.sql).toMatch(/SELECT[\s\S]+FROM orders WHERE/i)
    }
  })

  it('returns a conflict when a concurrent transition wins the conditional update', async () => {
    h.state.updateChanges = 0
    const response = await PATCH(request({ status: 'confirmed' }), {
      params: Promise.resolve({ id: 'order-1' }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'The order status changed. Refresh and try again.',
    })
  })

  it('extends only the same pending order version and audits with a mutation token', async () => {
    const response = await PATCH(request({ extend_hours: 24 }), {
      params: Promise.resolve({ id: 'order-1' }),
    })

    expect(response.status).toBe(200)
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch).toHaveLength(2)
    expect(batch[0].sql).toMatch(/pending_extension_token/i)
    expect(batch[1].sql).toMatch(/pending_extension_token/i)
  })
})
