// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const h = vi.hoisted(() => ({
  mockMode: { value: false },
  authorization: { value: {} as Record<string, unknown> },
  authorize: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/mock-data', () => ({ isSupabaseMockMode: () => h.mockMode.value }))
vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: (...args: unknown[]) => h.authorize(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: () => ({
      update: () => ({
        eq: () => ({ select: () => ({ maybeSingle: h.maybeSingle }) }),
      }),
    }),
  }),
}))

const { PATCH } = await import('@/app/api/admin/orders/[id]/route')
const id = '11111111-1111-4111-8111-111111111111'

function request() {
  return new NextRequest(`https://shop.example/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'confirmed' }),
  })
}

function assertResponse(response: Response | undefined): asserts response is Response {
  expect(response).toBeDefined()
  if (!response) throw new Error('Expected the route to return a response')
}

beforeEach(() => {
  h.mockMode.value = false
  h.authorize.mockResolvedValue({ ok: true, supabase: {}, user: { email: 'owner@example.com' } })
  h.maybeSingle.mockResolvedValue({ data: { id }, error: null })
})

describe('PATCH /api/admin/orders/:id', () => {
  it('never reports a mock mutation as successful', async () => {
    h.mockMode.value = true
    const response = await PATCH(request(), { params: Promise.resolve({ id }) })
    assertResponse(response)
    expect(response.status).toBe(503)
    expect(h.authorize).not.toHaveBeenCalled()
  })

  it('stops when the shared admin authorization rejects the request', async () => {
    h.authorize.mockResolvedValue({
      ok: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })
    const response = await PATCH(request(), { params: Promise.resolve({ id }) })
    assertResponse(response)
    expect(response.status).toBe(403)
    expect(h.maybeSingle).not.toHaveBeenCalled()
  })

  it('updates a valid order after authorization', async () => {
    const response = await PATCH(request(), { params: Promise.resolve({ id }) })
    assertResponse(response)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })
})
