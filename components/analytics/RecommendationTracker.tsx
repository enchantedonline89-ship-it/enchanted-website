'use client'

import { useEffect, type MouseEvent, type ReactNode } from 'react'
import { getAnalyticsConsent, isPrivateAnalyticsPath } from '@/components/analytics/consent'

type RecommendationEvent = {
  event_type: 'impression' | 'click' | 'add_to_cart'
  placement: 'pdp' | 'cart'
  source_product_id: string
  recommended_product_id: string
  position: number
}

const ANONYMOUS_ID_KEY = 'enchanted_analytics_anonymous_id'
const ATTRIBUTION_KEY = 'enchanted_recommendation_attribution'

function anonymousId(): string | null {
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.localStorage.setItem(ANONYMOUS_ID_KEY, created)
    return created
  } catch {
    return null
  }
}

function capture(events: RecommendationEvent[]) {
  if (!events.length || !getAnalyticsConsent() || isPrivateAnalyticsPath(window.location.pathname)) return
  const id = anonymousId()
  if (!id) return

  void fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Analytics-Consent': 'granted' },
    body: JSON.stringify({ anonymous_id: id, events }),
    keepalive: true,
  }).catch(() => undefined)

  void import('posthog-js').then(({ default: posthog }) => {
    if (!posthog.__loaded) return
    for (const event of events) posthog.capture(`recommendation_${event.event_type}`, event)
  })
}

export function captureRecommendationAdd(productId: string): void {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY)
    if (!raw) return
    const attribution = JSON.parse(raw) as {
      source_product_id?: string
      recommended_product_id?: string
      placement?: 'pdp' | 'cart'
      position?: number
      expires_at?: number
    }
    window.sessionStorage.removeItem(ATTRIBUTION_KEY)
    if (attribution.recommended_product_id !== productId
      || !attribution.source_product_id
      || !attribution.placement
      || !Number.isInteger(attribution.position)
      || Number(attribution.expires_at) < Date.now()) return
    capture([{
      event_type: 'add_to_cart',
      placement: attribution.placement,
      source_product_id: attribution.source_product_id,
      recommended_product_id: productId,
      position: attribution.position!,
    }])
  } catch {
    window.sessionStorage.removeItem(ATTRIBUTION_KEY)
  }
}

export default function RecommendationTracker({
  sourceProductId,
  recommendedProductIds,
  placement,
  children,
}: {
  sourceProductId: string
  recommendedProductIds: string[]
  placement: 'pdp' | 'cart'
  children: ReactNode
}) {
  useEffect(() => {
    capture(recommendedProductIds.map((recommendedProductId, position) => ({
      event_type: 'impression',
      placement,
      source_product_id: sourceProductId,
      recommended_product_id: recommendedProductId,
      position,
    })))
  }, [placement, recommendedProductIds, sourceProductId])

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-recommendation-id]')
      : null
    const recommendedProductId = target?.dataset.recommendationId
    const position = recommendedProductId
      ? recommendedProductIds.indexOf(recommendedProductId)
      : -1
    if (!recommendedProductId || position < 0) return
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
        source_product_id: sourceProductId,
        recommended_product_id: recommendedProductId,
        placement,
        position,
        expires_at: Date.now() + 30 * 60 * 1000,
      }))
    } catch {
      // Attribution is optional when storage is unavailable.
    }
    capture([{
      event_type: 'click',
      placement,
      source_product_id: sourceProductId,
      recommended_product_id: recommendedProductId,
      position,
    }])
  }

  return <div onClickCapture={handleClick}>{children}</div>
}
