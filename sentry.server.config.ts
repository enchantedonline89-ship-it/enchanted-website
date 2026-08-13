import * as Sentry from "@sentry/nextjs"

/**
 * Node runtime. Loaded from instrumentation.ts.
 *
 * Everything here is a no-op when SENTRY_DSN is unset, so the shop runs
 * perfectly well before anyone creates a Sentry project.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),

  // 10% in production is plenty for a shop this size and keeps the free tier honest.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // This shop handles names, phone numbers and delivery addresses. None of it
  // belongs in an error tracker.
  sendDefaultPii: false,

  beforeSend(event) {
    if (event.request?.data) delete event.request.data
    if (event.request?.cookies) delete event.request.cookies
    if (event.user) {
      event.user = { id: event.user.id }
    }
    return event
  },

  ignoreErrors: [
    // Client navigations that abort mid-flight are noise, not faults.
    "AbortError",
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
})
