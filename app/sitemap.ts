import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/seo/site"
import { mockProducts, mockCategories } from "@/lib/mock-data"

// Mirrors the visible "Last updated March 2026" copy shown on the policy
// pages (PageShell's meta prop). Keep this in sync if that copy changes.
const POLICY_LAST_UPDATED = new Date("2026-03-01")

// Real signal, not a fabricated date: the mock catalog's own updated_at
// timestamps, the same rows the homepage renders. Only static marketing
// routes are listed below; /admin, /auth, and /orders are gated (see
// proxy.ts) and are excluded, not just noindexed, so nothing sends a
// crawler to a URL that only ever redirects it away.
function catalogLastModified(): Date {
  const stamps = [...mockProducts, ...mockCategories].map((r) => new Date(r.updated_at).getTime())
  return stamps.length ? new Date(Math.max(...stamps)) : new Date()
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: catalogLastModified(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/size-guide`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/shipping`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/returns`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: POLICY_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ]
}
