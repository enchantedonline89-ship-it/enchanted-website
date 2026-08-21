declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string
    BETTER_AUTH_URL: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    RESEND_API_KEY?: string
    RESEND_FROM_EMAIL?: string
    RESEND_WEBHOOK_SECRET?: string
    POSTHOG_PERSONAL_API_KEY?: string
    POSTHOG_PROJECT_ID?: string
    POSTHOG_HOST?: string
    SENTRY_API_TOKEN?: string
    SENTRY_ORG?: string
    SENTRY_PROJECT?: string
  }
}

interface CloudflareEnv {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  RESEND_WEBHOOK_SECRET?: string
  POSTHOG_PERSONAL_API_KEY?: string
  POSTHOG_PROJECT_ID?: string
  POSTHOG_HOST?: string
  SENTRY_API_TOKEN?: string
  SENTRY_ORG?: string
  SENTRY_PROJECT?: string
}
