import { expect, test } from '@playwright/test'

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
    items: [{ name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 2, price: 89.99 }],
    subtotal: 179.98,
    total: 182.98,
    ...overrides,
  }
}

test.describe('POST /api/orders validation', () => {
  test('accepts a well-formed Beirut order', async ({ request }) => {
    const res = await request.post('/api/orders', { data: validOrder() })
    expect(res.status()).toBe(200)
    expect((await res.json()).id).toBeTruthy()
  })

  test('rejects the $3 Beirut fee on an outside-Beirut order', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: validOrder({ area: 'outside', city: 'Jounieh', delivery_fee: 3 }),
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/must be \$4/)
  })

  test('rejects the $4 fee on a Beirut order', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: validOrder({ delivery_fee: 4, total: 183.98 }),
    })
    expect(res.status()).toBe(400)
  })

  test('rejects a subtotal that does not match the line items', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: validOrder({ subtotal: 1, total: 4 }),
    })
    expect(res.status()).toBe(400)
  })

  test('rejects a total that does not match subtotal + fee', async ({ request }) => {
    const res = await request.post('/api/orders', { data: validOrder({ total: 5 }) })
    expect(res.status()).toBe(400)
  })

  test('rejects an empty cart', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: validOrder({ items: [], subtotal: 0, total: 3 }),
    })
    expect(res.status()).toBe(400)
  })

  test('rejects malformed JSON', async ({ request }) => {
    const res = await request.post('/api/orders', {
      headers: { 'content-type': 'application/json' },
      data: '{ not json',
    })
    expect(res.status()).toBe(400)
  })

  test('never echoes a caller-supplied user_id back as the order owner', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: validOrder({ user_id: 'attacker-controlled-id' }),
    })
    expect(res.status()).toBe(200)
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
