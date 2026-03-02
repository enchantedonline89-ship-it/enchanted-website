import type { NextConfig } from "next"

// ─── Security Headers ─────────────────────────────────────────────────────────
// Applied to every response. Adjust the CSP connect-src if the Supabase project
// URL changes (add the real URL once the client configures their project).
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
  // - img-src: self + data URIs + Unsplash (mock images) + Supabase storage
  // - font-src: self + Google Fonts (if used)
  // - connect-src: self + Supabase API + wa.me for WhatsApp link preflight
  // - frame-ancestors: none (reinforces X-Frame-Options)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // unsafe-inline required by Tailwind v4 CSS-in-JS approach;
      // unsafe-eval required by Three.js/GSAP in dev — tighten for production if possible
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://supabase.co",
      // connect-src covers Supabase REST + Auth + Realtime WebSocket
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://wa.me https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Supabase Storage — replace PROJECT_ID with your actual project ref
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
