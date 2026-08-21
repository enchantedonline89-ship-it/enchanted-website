import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/seo/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Account, order, admin, auth and JSON routes are private or transactional.
        disallow: ["/admin", "/account", "/orders", "/auth", "/api/"],
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
