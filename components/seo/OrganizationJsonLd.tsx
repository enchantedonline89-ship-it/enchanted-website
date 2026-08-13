import JsonLd from "./JsonLd"
import { SITE_URL, SITE_NAME, absoluteUrl } from "./site"

/** Given, verified contact facts only. Do not add anything not confirmed. */
const WHATSAPP_E164 = "+96181351084"
const INSTAGRAM_URL = "https://www.instagram.com/enchanted.style_"

/**
 * Sitewide identity graph: Organization + WebSite. Rendered once in the
 * root layout so it appears on every page.
 *
 * Deliberately no LocalBusiness node. That type expects a real street
 * address for rich-result eligibility, and this is a delivery-only catalog
 * with no storefront address to publish. Organization + areaServed states
 * the real, honest facts (who, where the brand operates, how to reach it)
 * without implying a shopfront that does not exist.
 *
 * Deliberately no AggregateRating or Review: there are no real reviews.
 * Deliberately no sameAs beyond Instagram: no Wikidata, LinkedIn, or
 * Crunchbase profile exists for this brand, and none is invented here.
 */
export default function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/logo.svg"),
        sameAs: [INSTAGRAM_URL],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: WHATSAPP_E164,
          contactType: "customer service",
          areaServed: "LB",
          availableLanguage: ["English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  }

  return <JsonLd data={data} />
}
