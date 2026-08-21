const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const CONSENT_KEY = 'enchanted_analytics_consent'

let posthogStarted = false
let replayStarted = false

function consentGranted(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
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

    const enableReplay = () => {
      if (replayStarted) return
      replayStarted = true
      Sentry.addIntegration(Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: false,
      }))
    }
    if (consentGranted()) enableReplay()
    window.addEventListener('enchanted:analytics-consent', ((event: CustomEvent<boolean>) => {
      if (event.detail) enableReplay()
    }) as EventListener)
  })
}

async function startPostHog() {
  if (!POSTHOG_KEY || posthogStarted || !consentGranted()) return
  posthogStarted = true
  const { default: posthog } = await import('posthog-js')
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
  posthog.capture('$pageview', { $current_url: window.location.href })
}

if (typeof window !== 'undefined') {
  void startPostHog()
  window.addEventListener('enchanted:analytics-consent', ((event: CustomEvent<boolean>) => {
    if (event.detail) void startPostHog()
  }) as EventListener)
}

type RouterTransitionArgs = Parameters<
  (typeof import('@sentry/nextjs'))['captureRouterTransitionStart']
>

export function onRouterTransitionStart(...args: RouterTransitionArgs) {
  if (!SENTRY_DSN) return
  void import('@sentry/nextjs').then((Sentry) => Sentry.captureRouterTransitionStart(...args))
}
