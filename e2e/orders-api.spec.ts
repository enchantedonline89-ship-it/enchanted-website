import { expect, test } from '@playwright/test'

test('an unauthenticated browser cannot create an order', async ({ request }) => {
  const response = await request.post('/api/orders', {
    data: {
      address_id: 'not-owned',
      items: [{ product_id: 'not-real', quantity: 1 }],
      checkout_intent_id: crypto.randomUUID(),
    },
  })
  expect(response.ok()).toBe(false)
  expect(response.status()).toBeGreaterThanOrEqual(400)
})
