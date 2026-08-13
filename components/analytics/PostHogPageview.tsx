"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * The App Router does not reload the document on client navigation, so PostHog's
 * automatic pageview capture would record exactly one view per session. This
 * fires a $pageview on every real route change instead.
 *
 * Must be wrapped in <Suspense> by the caller: useSearchParams opts the whole
 * subtree into client-side rendering otherwise.
 */
export default function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    let url = window.origin + pathname
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`

    void import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) {
        posthog.capture("$pageview", { $current_url: url })
      }
    })
  }, [pathname, searchParams])

  return null
}
