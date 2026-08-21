// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => {
  const audit = { error: null as null | { message: string } }
  const inserted = { id: '11111111-1111-4111-8111-111111111111', name: 'Sale' }
  const before = { ...inserted, discount_percent: 10 }
  const after = { ...inserted, discount_percent: 15 }
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'admin_logs') return { insert: vi.fn(async () => ({ error: audit.error })) }
      return {
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: inserted, error: null })) })) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: before, error: null })) })) })),
        update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: after, error: null })) })) })) })),
        delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      }
    }),
  }
  return { audit, inserted, after, supabase }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: vi.fn(async () => ({
    ok: true,
    supabase: h.supabase,
    user: { email: 'owner@example.com' },
  })),
}))
vi.mock('@/lib/promotion-input', () => ({
  validatePromotionInput: vi.fn(() => ({
    value: {
      name: 'Sale', description: null, campaign_type: 'discount', scope: 'sitewide',
      category_id: null, discount_percent: 15, starts_at: '2026-08-21T00:00:00.000Z',
      ends_at: null, is_active: true,
    },
  })),
}))

const { POST } = await import('@/app/api/admin/promotions/route')
const promotionById = await import('@/app/api/admin/promotions/[id]/route')

const id = '11111111-1111-4111-8111-111111111111'

function request(method: string) {
  return new NextRequest(`https://shop.example/api/admin/promotions/${id}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'DELETE' ? undefined : JSON.stringify({}),
  })
}

function assertResponse(response: Response | undefined): asserts response is Response {
  expect(response).toBeDefined()
  if (!response) throw new Error('Expected the route to return a response')
}

beforeEach(() => {
  h.audit.error = null
  h.supabase.from.mockClear()
})

describe('promotion mutation audit warnings', () => {
  it('keeps a successful create response and reports an audit failure', async () => {
    h.audit.error = { message: 'audit unavailable' }
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await POST(request('POST'))
    assertResponse(response)
    const json = await response.json()
    expect(response.status).toBe(201)
    expect(json.promotion).toEqual(h.inserted)
    expect(json.warning).toMatch(/audit entry failed/i)
    log.mockRestore()
  })

  it('reports an audit failure after a successful update', async () => {
    h.audit.error = { message: 'audit unavailable' }
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await promotionById.PATCH(request('PATCH'), { params: Promise.resolve({ id }) })
    assertResponse(response)
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.promotion).toEqual(h.after)
    expect(json.warning).toMatch(/audit entry failed/i)
    log.mockRestore()
  })

  it('reports an audit failure after a successful delete', async () => {
    h.audit.error = { message: 'audit unavailable' }
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await promotionById.DELETE(request('DELETE'), { params: Promise.resolve({ id }) })
    assertResponse(response)
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.deleted).toBe(true)
    expect(json.warning).toMatch(/audit entry failed/i)
    log.mockRestore()
  })

  it('does not add a warning when the audit entry succeeds', async () => {
    const response = await POST(request('POST'))
    assertResponse(response)
    const json = await response.json()
    expect(json.warning).toBeUndefined()
  })
})
