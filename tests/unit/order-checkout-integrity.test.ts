// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkoutIdempotencyKey, parseSubmittedLines } from '@/lib/orders/checkout'

describe('checkout integrity', () => {
  it('canonicalizes duplicate variant lines before pricing and inventory writes', () => {
    expect(parseSubmittedLines([
      { product_id: 'product-1', variant_id: 'variant-1', size: '38', qty: 2 },
      { product_id: 'product-1', variant_id: 'variant-1', size: '38', qty: 3 },
    ])).toEqual([
      { product_id: 'product-1', variant_id: 'variant-1', size: '38', qty: 5 },
    ])
  })

  it('rejects a merged line that exceeds the per-line checkout limit', () => {
    expect(parseSubmittedLines([
      { product_id: 'product-1', variant_id: 'variant-1', size: '38', qty: 11 },
      { product_id: 'product-1', variant_id: 'variant-1', size: '38', qty: 10 },
    ])).toBeNull()
  })

  it('accepts only bounded opaque checkout idempotency keys', () => {
    expect(checkoutIdempotencyKey('checkout_1234567890')).toBe('checkout_1234567890')
    expect(checkoutIdempotencyKey('short')).toBeNull()
    expect(checkoutIdempotencyKey('checkout key with spaces')).toBeNull()
  })
})
