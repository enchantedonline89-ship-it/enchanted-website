import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

const isDev = process.env.NODE_ENV === 'development'

// ─── Security Headers ─────────────────────────────────────────────────────────
// Applied to every response.
const securityHeaders = [
  // Prevent the site from being embedded in iframes (clickjacking protection)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME-type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information sent with requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Strict Transport Security — force HTTPS for 1 year (only effective on HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Disable browser features not needed by this site
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  // - default-src: only same-origin by default
  // - script-src: self + inline scripts required by Next.js hydration + GSAP CDN is NOT used (all local)
  // - style-src: self + unsafe-inline required by Tailwind v4 runtime
  // - img-src: same-origin Cloudflare media plus Google profile images
  // - font-src: self + Google Fonts (if used)
  // - connect-src: same-origin API/analytics plus Google authentication
  // - frame-ancestors: none (reinforces X-Frame-Options)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-eval only in dev (required by GSAP/Next.js hot reload).
      // Removed in production to prevent eval-based XSS exploitation.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      // unsafe-inline required by Tailwind v4 CSS-in-JS runtime approach
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
      "media-src 'self'",
      // PostHog's session recorder and Sentry's replay both run in web workers
      // created from blob URLs. Without this they fail silently.
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

// ─── Analytics and error tracking hosts ───────────────────────────────────────
// Both PostHog and Sentry are routed through this origin rather than called
// directly:
//   - PostHog via the rewrites below, under an unremarkable path.
//   - Sentry via withSentryConfig's tunnelRoute, at the bottom of this file.
// That keeps both working behind the ad blockers this audience runs, and means
// connect-src above stays 'self' with no third-party host added to the CSP.
const POSTHOG_PROXY_PATH = "/atelier"
const POSTHOG_ASSET_HOST = process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST ?? "https://eu-assets.i.posthog.com"
const POSTHOG_INGEST_HOST = process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST ?? "https://eu.i.posthog.com"

const nextConfig: NextConfig = {
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },

  // PostHog's ingestion endpoints end in a trailing slash. Without this, Next
  // redirects them and event capture breaks.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      // The two asset rules must precede the catch-all.
      {
        source: `${POSTHOG_PROXY_PATH}/static/:path*`,
        destination: `${POSTHOG_ASSET_HOST}/static/:path*`,
      },
      {
        source: `${POSTHOG_PROXY_PATH}/array/:path*`,
        destination: `${POSTHOG_ASSET_HOST}/array/:path*`,
      },
      {
        source: `${POSTHOG_PROXY_PATH}/:path*`,
        destination: `${POSTHOG_INGEST_HOST}/:path*`,
      },
    ]
  },
}

/**
 * Sentry wraps the config last so its build-time work (source maps, the tunnel
 * route) sits outermost.
 *
 * With no SENTRY_AUTH_TOKEN present the wrapper is inert at build time, so a
 * clone of this repo builds cleanly without any Sentry account.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Same-origin tunnel, for the same ad-blocker reason as the PostHog proxy.
  tunnelRoute: "/mtr",

  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,

  // Source maps are uploaded to Sentry and then removed from the deployed
  // output, so stack traces are readable without publishing the source.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
})

initOpenNextCloudflareForDev()
