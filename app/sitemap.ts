import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/seo/site"
import { getCatalog } from "@/lib/catalog"
import { productHref } from "@/lib/product-url"

// These reflect substantive, visible content changes rather than request time.
const POLICY_LAST_UPDATED = new Date("2026-03-01")
const SHIPPING_LAST_UPDATED = new Date("2026-08-14")
const HELP_LAST_UPDATED = new Date("2026-08-21")

// Only public marketing and live catalog routes are listed. Account, admin,
// authentication and order routes are deliberately excluded.
const SITE_LAST_UPDATED = new Date("2026-08-21")

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, source } = await getCatalog()
  const stamps = [...products, ...categories]
    .map((row) => new Date(row.updated_at).getTime())
    .filter(Number.isFinite)
  const catalogLastModified = source === "live" && stamps.length
    ? new Date(Math.max(...stamps))
    : SITE_LAST_UPDATED

  const productEntries: MetadataRoute.Sitemap = (source === "live" ? products : []).map((product) => ({
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
      lastModified: HELP_LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/shipping`,
      lastModified: SHIPPING_LAST_UPDATED,
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
      lastModified: HELP_LAST_UPDATED,
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
