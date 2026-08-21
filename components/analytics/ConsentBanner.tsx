'use client'

import { useEffect, useState } from 'react'

export const ANALYTICS_CONSENT_KEY = 'enchanted_analytics_consent'

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
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, allowed ? 'granted' : 'denied')
    } catch {
      // The custom event still applies the choice for the current page.
    }
    window.dispatchEvent(new CustomEvent('enchanted:analytics-consent', { detail: allowed }))
    setVisible(false)
  }

  if (!visible) return null
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
