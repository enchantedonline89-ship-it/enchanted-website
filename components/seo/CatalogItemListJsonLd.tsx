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
 * No offers, no price, no availability. The live backend is unreachable
 * (see PRODUCT.md) and the storefront is rendering a fallback mock catalog,
 * so price and stock cannot be verified as real, current inventory.
 * Emitting Offers/price on placeholder data is exactly the kind of
 * structured-data claim Google issues manual actions for. Revisit this the
 * day a real backend is reconnected.
 *
 * No url per item: there is no dedicated product page to point to, only
 * this shared catalog page, and every item would otherwise carry the
 * identical link.
 *
 * No aggregateRating, no review: there are no real reviews.
 */
export default function CatalogItemListJsonLd({ products }: { products: Product[] }) {
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
