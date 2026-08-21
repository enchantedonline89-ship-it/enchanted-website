// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockOrderNumber } from '@/lib/mock-order'

const h = vi.hoisted(() => ({
  mockMode: { value: false },
  from: vi.fn(),
  select: vi.fn(),
  match: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/mock-data', () => ({
  isSupabaseMockMode: () => h.mockMode.value,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({ from: h.from }),
}))

const { POST } = await import('@/app/api/orders/track/route')

let ip = 0
function request(body: unknown) {
  ip += 1
  return new Request('http://localhost/api/orders/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': `10.44.0.${ip}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  h.mockMode.value = false
  h.maybeSingle.mockResolvedValue({
    data: {
      order_number: 'ES-2608-001001',
      status: 'confirmed',
      created_at: '2026-08-14T09:30:00.000Z',
      updated_at: '2026-08-14T10:15:00.000Z',
    },
    error: null,
  })
  h.match.mockReturnValue({ maybeSingle: h.maybeSingle })
  h.select.mockReturnValue({ match: h.match })
  h.from.mockReturnValue({ select: h.select })
})

describe('POST /api/orders/track', () => {
  it('normalizes the reference and email and returns only tracking-safe fields', async () => {
    const response = await POST(request({
      order_number: ' es-2608-001001 ',
      email: ' NOUR@Example.COM ',
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(h.match).toHaveBeenCalledWith({
      order_number: 'ES-2608-001001',
      user_email: 'nour@example.com',
    })
    expect(h.select).toHaveBeenCalledWith('order_number,status,created_at,updated_at')
    expect(Object.keys(json.order).sort()).toEqual([
      'created_at', 'order_number', 'status', 'updated_at',
    ])
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('rejects malformed input before touching the database', async () => {
    const response = await POST(request({ order_number: '1001', email: 'not-an-email' }))
    expect(response.status).toBe(400)
    expect(h.from).not.toHaveBeenCalled()
  })

  it('uses the same generic not-found response for an unknown number/email pair', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await POST(request({
      order_number: 'ES-2608-999999',
      email: 'nour@example.com',
    }))
    const json = await response.json()
    expect(response.status).toBe(404)
    expect(json.error).toBe('We could not find an order matching those details.')
  })

  it('does not leak database details when tracking is unavailable', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'relation public.orders does not exist' },
    })
    const response = await POST(request({
      order_number: 'ES-2608-001001',
      email: 'nour@example.com',
    }))
    const json = await response.json()
    expect(response.status).toBe(503)
    expect(json.error).not.toMatch(/relation|public\.orders/i)
    log.mockRestore()
  })

  it('provides a fictional lookup only in mock mode', async () => {
    h.mockMode.value = true
    const email = 'demo@enchanted.style'
    const response = await POST(request({
      order_number: mockOrderNumber(email),
      email,
    }))
    expect(response.status).toBe(200)
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a fictional reference paired with a different email', async () => {
    h.mockMode.value = true
    const response = await POST(request({
      order_number: mockOrderNumber('demo@enchanted.style'),
      email: 'someone-else@example.com',
    }))
    expect(response.status).toBe(404)
    expect(h.from).not.toHaveBeenCalled()
  })
})
