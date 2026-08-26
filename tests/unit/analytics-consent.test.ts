import { describe, expect, it } from 'vitest'
import { isPrivateAnalyticsPath } from '@/components/analytics/consent'

describe('analytics route privacy', () => {
  it.each(['/admin', '/admin/orders', '/account', '/orders/ES-1', '/auth/signin', '/checkout', '/track-order'])(
    'blocks analytics on %s',
    path => expect(isPrivateAnalyticsPath(path)).toBe(true),
  )

  it.each(['/', '/product/a-123456', '/category/dresses', '/privacy'])(
    'allows consented analytics on %s',
    path => expect(isPrivateAnalyticsPath(path)).toBe(false),
  )
})
