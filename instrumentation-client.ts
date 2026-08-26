import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_ROUTE_EVENT,
  getAnalyticsConsent,
  isPrivateAnalyticsPath,
} from '@/components/analytics/consent'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

let posthogStarted = false
let posthogCapturing = false
let replayAdded = false
let replayRunning = false
let routeAllowsAnalytics = typeof window !== 'undefined'
  && !isPrivateAnalyticsPath(window.location.pathname)

function analyticsAllowed(): boolean {
  return routeAllowsAnalytics && getAnalyticsConsent()
}

if (SENTRY_DSN) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
      environment: process.env.NODE_ENV,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request?.data) delete event.request.data
        if (event.user) event.user = { id: event.user.id }
        return event
      },
      ignoreErrors: [
        'AbortError',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
      ],
    })

    const syncReplay = () => {
      if (analyticsAllowed()) {
        if (!replayAdded) {
          replayAdded = true
          Sentry.addIntegration(Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
          }))
          Sentry.getReplay()?.start()
          replayRunning = true
        } else if (!replayRunning) {
          Sentry.getReplay()?.start()
          replayRunning = true
        }
      } else if (replayRunning) {
        replayRunning = false
        void Sentry.getReplay()?.stop({ flush: false })
      }
    }
    syncReplay()
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncReplay)
    window.addEventListener(ANALYTICS_ROUTE_EVENT, ((event: CustomEvent<boolean>) => {
      routeAllowsAnalytics = event.detail
      syncReplay()
    }) as EventListener)
  })
}

async function startPostHog() {
  if (!POSTHOG_KEY || posthogStarted || !analyticsAllowed()) return
  posthogStarted = true
  const { default: posthog } = await import('posthog-js')
  if (!analyticsAllowed()) {
    posthogStarted = false
    return
  }
  posthog.init(POSTHOG_KEY, {
    api_host: '/atelier',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://eu.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: { dom_event_allowlist: ['click'] },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask], form, [data-sensitive]',
    },
    persistence: 'localStorage+cookie',
  })
  posthogCapturing = true
}

async function syncPostHog(reset = false) {
  if (!POSTHOG_KEY) return
  if (!posthogStarted) {
    if (analyticsAllowed()) await startPostHog()
    return
  }
  const { default: posthog } = await import('posthog-js')
  if (analyticsAllowed()) {
    if (posthogCapturing) return
    posthog.opt_in_capturing()
    posthog.startSessionRecording()
    posthogCapturing = true
  } else {
    if (posthogCapturing) posthog.stopSessionRecording()
    if (reset) posthog.reset()
    posthog.opt_out_capturing()
    posthogCapturing = false
  }
}

async function capturePageview() {
  await syncPostHog()
  if (!POSTHOG_KEY || !posthogStarted || !analyticsAllowed()) return
  const { default: posthog } = await import('posthog-js')
  posthog.capture('$pageview', { $current_url: window.origin + window.location.pathname })
}

if (typeof window !== 'undefined') {
  void startPostHog()
  window.addEventListener(ANALYTICS_CONSENT_EVENT, ((event: CustomEvent<boolean>) => {
    if (event.detail) void capturePageview()
    else void syncPostHog(true)
  }) as EventListener)
  window.addEventListener(ANALYTICS_ROUTE_EVENT, ((event: CustomEvent<boolean>) => {
    routeAllowsAnalytics = event.detail
    if (event.detail) void capturePageview()
    else void syncPostHog()
  }) as EventListener)
}

type RouterTransitionArgs = Parameters<
  (typeof import('@sentry/nextjs'))['captureRouterTransitionStart']
>

export function onRouterTransitionStart(...args: RouterTransitionArgs) {
  if (!SENTRY_DSN) return
  void import('@sentry/nextjs').then((Sentry) => Sentry.captureRouterTransitionStart(...args))
}
