"use client"

import { useState } from "react"
import Image from "next/image"
import ImageLightbox from "./ImageLightbox"
import type { Product } from "@/types"

/**
 * Deliberately a different layout family from the catalog grid: a track that runs
 * off the right edge of the viewport, so the page reads as having an edge to follow.
 */
export default function NewArrivals({ products }: { products: Product[] }) {
  const [lightbox, setLightbox] = useState<Product | null>(null)

  if (products.length === 0) return null

  return (
    <section
      id="new"
      aria-labelledby="new-heading"
      className="scroll-mt-[68px] pb-16 pt-(--spacing-section) lg:pb-20"
    >
      <div className="mx-auto mb-10 max-w-[1440px] px-5 lg:px-10">
        <h2 id="new-heading" className="t-section text-ink">
          Just arrived
        </h2>
      </div>

      {/* scroll-pl keeps the snapport inside the page gutter, otherwise mandatory
          snapping pulls the first tile flush to the viewport edge on load */}
      <ul className="track-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-5 px-5 pb-2 lg:gap-6 lg:scroll-pl-10 lg:px-10">
        {products.map((product) => {
          const src = product.image_url
          return (
            <li
              key={product.id}
              className="w-[74vw] shrink-0 snap-start sm:w-[46vw] lg:w-[26vw] xl:w-[22vw]"
            >
              <button
                type="button"
                onClick={() => setLightbox(product)}
                className="media-zoom relative block aspect-[3/4] w-full"
                aria-label={`View ${product.name} larger`}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 74vw, (max-width: 1024px) 46vw, 26vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="t-meta absolute inset-0 flex items-center justify-center bg-paper-raised">
                    No photo yet
                  </span>
                )}
              </button>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <p className="text-[0.9375rem] leading-snug text-ink">{product.name}</p>
                <p className="tnum shrink-0 text-[0.9375rem] text-ink-dim">
                  {product.price != null ? `$${product.price.toFixed(2)}` : "Ask"}
                </p>
              </div>
            </li>
          )
        })}
        {/* Trailing gutter so the last tile can snap clear of the edge */}
        <li aria-hidden="true" className="w-1 shrink-0 lg:w-6" />
      </ul>

      <ImageLightbox product={lightbox} onClose={() => setLightbox(null)} />
    </section>
  )
}
