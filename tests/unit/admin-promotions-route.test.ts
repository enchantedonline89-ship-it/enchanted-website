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
  const promotionRow = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Existing sale',
    description: null,
    campaign_type: 'discount',
    scope: 'sitewide',
    category_id: null,
    discount_basis_points: 1000,
    starts_at: '2026-08-21T00:00:00.000Z',
    ends_at: null,
    is_active: 1,
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
    category_name: null,
  }
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
          if (/FROM promotions p/i.test(sql)) return promotionRow as T
          return null
        },
      }
      statements.push(statement)
      return statement
    }),
    batch: vi.fn(async (batch: Statement[]) => batch.map(() => ({ success: true, results: [] }))),
  }
  return { db, statements }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: vi.fn(async () => ({
    ok: true,
    db: h.db,
    user: { id: 'admin-id', email: 'owner@example.com', name: 'Owner', role: 'admin' },
  })),
}))

const { POST } = await import('@/app/api/admin/promotions/route')
const promotionById = await import('@/app/api/admin/promotions/[id]/route')

const id = '11111111-1111-4111-8111-111111111111'

function request(method: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`https://shop.example/api/admin/promotions/${id}`, {
    method,
    headers: { 'content-type': 'application/json', origin: 'https://shop.example' },
    body: method === 'DELETE' ? undefined : JSON.stringify({
      name: 'Summer sale',
      description: null,
      campaign_type: 'discount',
      scope: 'sitewide',
      category_id: null,
      discount_percent: 15,
      starts_at: '2026-08-21T00:00:00.000Z',
      ends_at: null,
      is_active: true,
      ...body,
    }),
  })
}

beforeEach(() => {
  h.statements.splice(0)
  h.db.prepare.mockClear()
  h.db.batch.mockClear()
  h.db.batch.mockImplementation(async (batch: Statement[]) => (
    batch.map(() => ({ success: true, results: [] }))
  ))
})

describe('D1 promotion mutations', () => {
  it('creates a promotion and audit record in one bound D1 batch', async () => {
    const response = await POST(request('POST'))
    const json = await response.json() as { promotion: Record<string, unknown> }

    expect(response.status).toBe(201)
    expect(json.promotion).toMatchObject({
      name: 'Summer sale',
      discount_percent: 15,
      is_active: true,
    })
    expect(h.db.batch).toHaveBeenCalledTimes(1)
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch).toHaveLength(2)
    expect(batch[0].sql).toMatch(/INSERT INTO promotions/i)
    expect(batch[0].bindings).toContain(1500)
    expect(batch[1].sql).toMatch(/INSERT INTO admin_audit_logs/i)
    expect(batch[1].bindings).toContain('owner@example.com')
  })

  it('rejects an inactive or missing category before writing', async () => {
    const response = await POST(request('POST', {
      scope: 'category',
      category_id: 'missing-category',
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Choose an active category for this discount.' })
    expect(h.db.batch).not.toHaveBeenCalled()
  })

  it('updates and audits the existing D1 row atomically', async () => {
    const response = await promotionById.PATCH(request('PATCH'), {
      params: Promise.resolve({ id }),
    })

    expect(response.status).toBe(200)
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch[0].sql).toMatch(/UPDATE promotions/i)
    expect(batch[1].sql).toMatch(/INSERT INTO admin_audit_logs/i)
    expect(batch[1].bindings).toContain('UPDATE')
  })

  it('fails the request when the atomic mutation/audit batch fails', async () => {
    h.db.batch.mockRejectedValueOnce(new Error('audit constraint failed'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(request('POST'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Could not create that event.' })
    log.mockRestore()
  })

  it('deletes and audits in a single D1 batch', async () => {
    const response = await promotionById.DELETE(request('DELETE'), {
      params: Promise.resolve({ id }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deleted: true })
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch[0].sql).toMatch(/DELETE FROM promotions/i)
    expect(batch[1].sql).toMatch(/INSERT INTO admin_audit_logs/i)
    expect(batch[1].bindings).toContain('DELETE')
  })
})
