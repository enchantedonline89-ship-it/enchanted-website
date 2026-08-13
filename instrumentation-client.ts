import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

/**
 * Client-side instrumentation. Next.js loads this file automatically on the
 * browser, before the app renders, which is why both SDKs live here rather than
 * inside a provider component.
 *
 * Both are strictly opt-in: with no environment variables set, neither sends
 * anything and the shop behaves exactly as it does today.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Session replay is genuinely useful for a checkout nobody can watch over the
  // shoulder of, but it records the screen. Everything is masked by default and
  // only error sessions are kept.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],

  // Customers type their name, phone and address into this site.
  sendDefaultPii: false,

  ignoreErrors: [
    "AbortError",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Instagram and Facebook in-app browsers inject scripts that throw.
    "Non-Error promise rejection captured",
  ],
})

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    // Same-origin proxy. Keeps analytics working behind ad blockers and means
    // the strict CSP needs no third-party connect-src entry. See next.config.ts.
    api_host: "/atelier",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",

    // Pageviews are captured manually, because the App Router does not trigger
    // a document load on client navigation and would otherwise record one view
    // per session. See components/analytics/PostHogPageview.tsx.
    capture_pageview: false,
    capture_pageleave: true,

    // Never record what a customer types into the checkout form.
    autocapture: {
      dom_event_allowlist: ["click"],
    },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask]",
    },
    persistence: "localStorage+cookie",
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
