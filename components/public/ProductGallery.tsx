"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import ImageLightbox from "./ImageLightbox"
import type { Product } from "@/types"

/**
 * Scroll-snap gallery. No carousel library, no dots, never auto-advances.
 *
 * Position is shown as a "2 / 4" counter rather than dots: it carries more
 * information and DESIGN.md bans decorative status dots. Tapping opens the
 * lightbox at the frame you were looking at.
 */
export default function ProductGallery({ product }: { product: Product }) {
  const images = [product.image_url, ...(product.additional_images ?? [])].filter(
    Boolean,
  ) as string[]

  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [lightboxAt, setLightboxAt] = useState<number | null>(null)

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(Math.max(0, Math.min(i, images.length - 1)))
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-paper-sunken">
        <span className="t-meta">No photo yet</span>
      </div>
    )
  }

  return (
    <>
      {/* Phone: one full-bleed frame per swipe. Desktop: stacked, no carousel,
          which is immune to how many photos a product happens to have. */}
      <div className="relative lg:hidden">
        <ul
          ref={trackRef}
          onScroll={onScroll}
          className="track-scroll flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((src, i) => (
            <li key={src} className="w-full shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setLightboxAt(i)}
                className="relative block aspect-[3/4] w-full bg-paper-sunken"
                aria-label={`View ${product.name}, image ${i + 1} of ${images.length}, larger`}
              >
                <Image
                  src={src}
                  alt={`${product.name}, view ${i + 1} of ${images.length}`}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>

        {images.length > 1 && (
          <p className="tnum t-meta absolute bottom-3 right-3 bg-paper/80 px-2 py-1 text-ink">
            {index + 1} / {images.length}
          </p>
        )}
      </div>

      <ul className="hidden lg:flex lg:flex-col lg:gap-2">
        {images.map((src, i) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setLightboxAt(i)}
              className="media-zoom relative block aspect-[3/4] w-full"
              aria-label={`View ${product.name}, image ${i + 1} of ${images.length}, larger`}
            >
              <Image
                src={src}
                alt={`${product.name}, view ${i + 1} of ${images.length}`}
                fill
                priority={i === 0}
                sizes="50vw"
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <ImageLightbox
        product={lightboxAt === null ? null : product}
        initialIndex={lightboxAt ?? 0}
        onClose={() => setLightboxAt(null)}
      />
    </>
  )
}
