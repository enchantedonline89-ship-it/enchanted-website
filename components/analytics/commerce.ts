'use client'

import { getAnalyticsConsent, isPrivateAnalyticsPath } from '@/components/analytics/consent'

export function captureCommerceEvent(
  name: 'product_added' | 'checkout_started' | 'order_submitted',
  properties: Record<string, string | number | boolean | null>,
): void {
  if (!getAnalyticsConsent() || isPrivateAnalyticsPath(window.location.pathname)) return
  void import('posthog-js').then(({ default: posthog }) => {
    if (posthog.__loaded) posthog.capture(name, properties)
  })
}
