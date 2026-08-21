// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteOrders: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: h.getUser } }),
  createServiceClient: async () => ({
    from: () => ({ delete: () => ({ eq: h.deleteOrders }) }),
    auth: { admin: { deleteUser: h.deleteUser } },
  }),
}))

const { DELETE } = await import('@/app/api/account/delete/route')
let ip = 0

function request(origin = 'https://shop.example') {
  ip += 1
  return new NextRequest('https://shop.example/api/account/delete', {
    method: 'DELETE',
    headers: { origin, 'cf-connecting-ip': `192.0.2.${ip}` },
  })
}

beforeEach(() => {
  h.getUser.mockResolvedValue({
    data: { user: { id: 'customer-id', email: 'customer@example.com' } },
    error: null,
  })
  h.deleteOrders.mockResolvedValue({ error: null })
  h.deleteUser.mockResolvedValue({ error: null })
})

describe('DELETE /api/account/delete', () => {
  it('rejects a cross-origin browser mutation before reading the session', async () => {
    const response = await DELETE(request('https://attacker.example'))
    expect(response.status).toBe(403)
    expect(h.getUser).not.toHaveBeenCalled()
  })

  it('deletes only the verified caller account', async () => {
    const response = await DELETE(request())
    expect(response.status).toBe(200)
    expect(h.deleteOrders).toHaveBeenCalledWith('user_id', 'customer-id')
    expect(h.deleteUser).toHaveBeenCalledWith('customer-id')
  })
})
