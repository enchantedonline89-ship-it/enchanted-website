'use client'

import { useEffect, useState } from 'react'
import {
  ANALYTICS_CONSENT_KEY,
  setAnalyticsConsent,
} from '@/components/analytics/consent'

export { ANALYTICS_CONSENT_KEY } from '@/components/analytics/consent'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setVisible(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === null)
      } catch {
        setVisible(true)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  function decide(allowed: boolean) {
    setAnalyticsConsent(allowed)
    setVisible(false)
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-3 left-3 z-[99] border border-line bg-paper-raised px-3 py-2 text-xs text-ink-dim shadow-sm hover:text-ink"
      >
        Privacy choices
      </button>
    )
  }
  return (
    <aside
      aria-label="Analytics choice"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl border border-line bg-paper-raised p-4 shadow-xl sm:bottom-5 sm:flex sm:items-center sm:gap-5 sm:p-5"
    >
      <p className="flex-1 text-sm leading-6 text-ink-dim">
        Help us improve Enchanted with masked usage analytics and error replay. Checkout,
        address, account and admin inputs are never recorded.
      </p>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <button type="button" onClick={() => decide(false)} className="btn btn-ghost flex-1 sm:flex-none">No thanks</button>
        <button type="button" onClick={() => decide(true)} className="btn btn-primary flex-1 sm:flex-none">Allow analytics</button>
      </div>
    </aside>
  )
}
