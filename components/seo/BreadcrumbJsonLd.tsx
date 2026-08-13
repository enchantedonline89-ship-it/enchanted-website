import JsonLd from "./JsonLd"
import { absoluteUrl } from "./site"

/**
 * BreadcrumbList for a flat, one-level site: Home, then the current page.
 * Home is added automatically, callers pass only the current page.
 */
export default function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[]
}) {
  const trail = [{ name: "Home", path: "/" }, ...items]

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }

  return <JsonLd data={data} />
}
