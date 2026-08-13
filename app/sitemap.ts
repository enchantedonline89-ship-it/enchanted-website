import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/seo/site"
import { getCatalog } from "@/lib/catalog"
import { productHref } from "@/lib/product-url"

// Mirrors the visible "Last updated March 2026" copy shown on the policy
// pages (PageShell's meta prop). Keep this in sync if that copy changes.
const POLICY_LAST_UPDATED = new Date("2026-03-01")

// Real signal, not a fabricated date: the mock catalog's own updated_at
// timestamps, the same rows the homepage renders. Only static marketing
// routes are listed below; /admin, /auth, and /orders are gated (see
// proxy.ts) and are excluded, not just noindexed, so nothing sends a
// crawler to a URL that only ever redirects it away.
const SITE_LAST_UPDATED = new Date("2026-08-12")

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getCatalog()
  const stamps = [...products, ...categories]
    .map((row) => new Date(row.updated_at).getTime())
    .filter(Number.isFinite)
  const catalogLastModified = stamps.length
    ? new Date(Math.max(...stamps))
    : SITE_LAST_UPDATED

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: new URL(productHref(product), SITE_URL).toString(),
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
    images: product.image_url ? [product.image_url] : undefined,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: catalogLastModified,
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
    ...productEntries,
  ]
}
