"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  ANALYTICS_ROUTE_EVENT,
  isPrivateAnalyticsPath,
} from "@/components/analytics/consent"

/**
 * The App Router does not reload the document on client navigation, so PostHog's
 * automatic pageview capture would record exactly one view per session. This
 * fires a $pageview on every real route change instead.
 *
 */
export default function PostHogPageview() {
  const pathname = usePathname()

  useEffect(() => {
    const isPrivate = isPrivateAnalyticsPath(pathname)
    window.dispatchEvent(new CustomEvent(ANALYTICS_ROUTE_EVENT, { detail: !isPrivate }))
  }, [pathname])

  return null
}
