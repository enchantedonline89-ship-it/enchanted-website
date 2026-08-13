import * as Sentry from "@sentry/nextjs"

/**
 * Next.js calls register() once per runtime at boot. Sentry's server and edge
 * SDKs must be initialised here rather than in a module import, so that they
 * are in place before any request handler runs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

/**
 * Captures errors thrown inside server components, route handlers and server
 * actions. Without this, a failure in the order API surfaces to the customer
 * and to nobody else.
 */
export const onRequestError = Sentry.captureRequestError
