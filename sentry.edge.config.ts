import * as Sentry from "@sentry/nextjs"

/**
 * Edge runtime, which is where proxy.ts runs. Loaded from instrumentation.ts.
 * Kept deliberately lean: the edge bundle is on the critical path for every
 * request, including the admin auth check.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
})
