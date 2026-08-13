import { expect, test } from '@playwright/test'

let ipSequence = 0
const freshHeaders = () => ({ 'x-real-ip': `10.8.0.${++ipSequence}` })

/**
 * Server-side validation of POST /api/orders, hit directly over HTTP.
 * These are the assertions that must hold no matter what the client sends.
 */

function validOrder(overrides: Record<string, unknown> = {}) {
  return {
    full_name: 'Nour Khalil',
    user_email: 'nour@example.com',
    phone: '03 456 789',
    delivery_address: 'Hamra Street, Building 4, 2nd floor',
    area: 'beirut',
    city: null,
    order_notes: null,
    delivery_fee: 3,
    items: [{ product_id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 2, price: 89.99 }],
    subtotal: 179.98,
    total: 182.98,
    ...overrides,
  }
}

test.describe('POST /api/orders validation', () => {
  test('requires a verified account for a well-formed order', async ({ request }) => {
    const res = await request.post('/api/orders', { headers: freshHeaders(), data: validOrder() })
    expect(res.status()).toBe(401)
    expect((await res.json()).error).toMatch(/sign in/i)
  })

  test('rejects the $3 Beirut fee on an outside-Beirut order', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: freshHeaders(),
      data: validOrder({ area: 'outside', city: 'Jounieh', delivery_fee: 3 }),
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/must be \$4/)
  })

  test('rejects the $4 fee on a Beirut order', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: freshHeaders(),
      data: validOrder({ delivery_fee: 4, total: 183.98 }),
    })
    expect(res.status()).toBe(400)
  })

  test('does not trust a caller subtotal before authentication', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: freshHeaders(),
      data: validOrder({ subtotal: 1, total: 4 }),
    })
    expect(res.status()).toBe(401)
  })

  test('rejects a total that does not match subtotal + fee', async ({ request }) => {
    const res = await request.post('/api/orders', { headers: freshHeaders(), data: validOrder({ total: 5 }) })
    expect(res.status()).toBe(400)
  })

  test('rejects an empty cart', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: freshHeaders(),
      data: validOrder({ items: [], subtotal: 0, total: 3 }),
    })
    expect(res.status()).toBe(400)
  })

  test('rejects malformed JSON', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: { 'content-type': 'application/json', ...freshHeaders() },
      data: '{ not json',
    })
    expect(res.status()).toBe(400)
  })

  test('never accepts a caller-supplied user_id without authentication', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: freshHeaders(),
      data: validOrder({ user_id: 'attacker-controlled-id' }),
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('attacker-controlled-id')
  })

  test('rate limits a burst from one client', async ({ request }) => {
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await request.post('/api/orders', { data: validOrder() })
      statuses.push(res.status())
    }
    expect(statuses).toContain(429)
  })
})
