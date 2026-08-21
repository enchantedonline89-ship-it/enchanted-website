import JsonLd from "./JsonLd"
import { SITE_NAME } from "./site"
import type { Product } from "@/types"
import { productHref } from "@/lib/product-url"
import { absoluteUrl } from "./site"

/**
 * Represents the catalog grid on the homepage as an ItemList. Pass the same
 * `products` array that renders in ProductGrid, so structured data can
 * never drift from what a visitor actually sees.
 *
 * Deliberately minimal Product nodes: name, image, category, brand only.
 *
 * Offers stay on live product-detail pages. Omitting price and availability
 * here prevents this summary graph from asserting inventory when a preview is
 * using the fallback catalog. Every item points to its dedicated product page.
 *
 * No aggregateRating, no review: there are no real reviews.
 */
export default function CatalogItemListJsonLd({
  products,
  live,
}: {
  products: Product[]
  live: boolean
}) {
  if (!live) return null

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} catalog`,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: product.name,
        url: absoluteUrl(productHref(product)),
        brand: { "@type": "Brand", name: SITE_NAME },
        ...(product.image_url ? { image: product.image_url } : {}),
        ...(product.category?.name ? { category: product.category.name } : {}),
      },
    })),
  }

  return <JsonLd data={data} />
}
