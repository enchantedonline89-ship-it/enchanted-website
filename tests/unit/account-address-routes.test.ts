// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({
  session: { value: { user: { id: 'owner-a' } } as { user: { id: string } } | null },
  getSession: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  db: { prepare: vi.fn(), batch: vi.fn() },
}))

vi.mock('@/lib/auth/server', () => ({
  getAuth: async () => ({ api: { getSession: h.getSession } }),
}))
vi.mock('@/lib/cloudflare/d1', () => ({ getD1Database: async () => h.db }))
vi.mock('@/lib/customer-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/customer-data')>()
  return {
    ...original,
    updateCustomerAddress: (...args: unknown[]) => h.update(...args),
    softDeleteCustomerAddress: (...args: unknown[]) => h.remove(...args),
  }
})

const { PATCH, DELETE } = await import('@/app/api/account/addresses/[id]/route')
const id = '11111111-1111-4111-8111-111111111111'

const input = {
  label: 'Home',
  recipientName: 'Teri Rita',
  phone: '+961 81 492 994',
  countryCode: 'LB',
  governorate: 'Beirut',
  city: 'Beirut',
  area: 'Achrafieh',
  street: 'Sassine Square',
  building: '',
  floor: '',
  landmark: '',
  deliveryNotes: '',
  isDefault: false,
}

function patchRequest(origin = 'https://shop.example') {
  return new NextRequest(`https://shop.example/api/account/addresses/${id}`, {
    method: 'PATCH',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

function deleteRequest(origin = 'https://shop.example') {
  return new NextRequest(`https://shop.example/api/account/addresses/${id}`, {
    method: 'DELETE',
    headers: { origin },
  })
}

beforeEach(() => {
  h.session.value = { user: { id: 'owner-a' } }
  h.getSession.mockImplementation(async () => h.session.value)
  h.update.mockResolvedValue({ id, ...input, phone: '+96181492994' })
  h.remove.mockResolvedValue({ deletedId: id, defaultAddressId: null })
})

describe('customer address item routes', () => {
  it('rejects a cross-site mutation before authentication or D1', async () => {
    const response = await PATCH(patchRequest('https://attacker.example'), {
      params: Promise.resolve({ id }),
    })
    expect(response.status).toBe(403)
    expect(h.getSession).not.toHaveBeenCalled()
    expect(h.update).not.toHaveBeenCalled()
  })

  it('requires an authenticated Better Auth session', async () => {
    h.session.value = null
    const response = await PATCH(patchRequest(), { params: Promise.resolve({ id }) })
    expect(response.status).toBe(401)
    expect(h.update).not.toHaveBeenCalled()
  })

  it('derives ownership from the session and never from JSON', async () => {
    const response = await PATCH(patchRequest(), { params: Promise.resolve({ id }) })
    expect(response.status).toBe(200)
    expect(h.update).toHaveBeenCalledWith(
      h.db,
      'owner-a',
      id,
      expect.objectContaining({ countryCode: 'LB', phone: '+96181492994' }),
    )
  })

  it('passes the session owner into a soft delete', async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id }) })
    expect(response.status).toBe(200)
    expect(h.remove).toHaveBeenCalledWith(h.db, 'owner-a', id)
  })
})
