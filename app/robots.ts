import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/seo/site"

export default function robots(): MetadataRoute.Robots {
  // A host can deliberately enable the mock catalog for a client preview.
  // Those fictional products must be viewable but never indexed as inventory.
  if (process.env.ENABLE_MOCK_CATALOG === "true") {
    return {
      rules: { userAgent: "*", disallow: "/" },
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin: staff CMS, gated by middleware.ts. /orders: per-customer
        // order history, gated by middleware.ts. /auth: OAuth callback and password
        // reset, transactional and sometimes token-bearing. /api: JSON
        // endpoints, nothing for a crawler to index.
        disallow: ["/admin", "/orders", "/auth", "/api/"],
      },
      {
        // Documented to ignore robots.txt in practice. This rule is a
        // correct signal for any tooling that does honour it; actually
        // blocking it requires a WAF/edge rule, which is outside this
        // file's reach and outside this task's scope.
        userAgent: "Bytespider",
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
