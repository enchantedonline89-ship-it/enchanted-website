"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check } from "@phosphor-icons/react/ssr"
import { useCart } from "@/lib/cart-context"
import { productHref } from "@/lib/product-url"
import { useGoldTilt } from "@/components/three/useGoldTilt"
import type { Product } from "@/types"
import ProductPrice from "./ProductPrice"

/**
 * No card chrome. The photograph is the tile, type sits under it, and the only
 * thing that moves on hover is the image itself.
 *
 * The tile links to the product page. `linkOnly` drops the size row and the add
 * button, which is what the related-products strip uses: adding a piece you have
 * not actually looked at is exactly the wrong-size order the product page exists
 * to prevent.
 */
export default function ProductCard({
  product,
  priority = false,
  linkOnly = false,
}: {
  product: Product
  priority?: boolean
  linkOnly?: boolean
}) {
  const { addToCart } = useCart()
  const hasSizes = Boolean(product.sizes?.length)
  const [size, setSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [needsSize, setNeedsSize] = useState(false)

  const tiltRef = useGoldTilt<HTMLAnchorElement>()

  const addedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(addedTimer.current), [])

  const images = [product.image_url, ...(product.additional_images ?? [])].filter(
    Boolean,
  ) as string[]

  function handleAdd() {
    if (hasSizes && !size) {
      setNeedsSize(true)
      return
    }
    addToCart(product, hasSizes ? size : null)
    setNeedsSize(false)
    setAdded(true)
    window.clearTimeout(addedTimer.current)
    addedTimer.current = window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <article className="group flex flex-col">
      <Link
        ref={tiltRef}
        href={productHref(product)}
        className="media-zoom gtilt-tile relative block aspect-[3/4] w-full"
      >
        {images[0] ? (
          <Image
            src={images[0]}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 420px"
            className="object-cover"
          />
        ) : (
          <span className="t-meta absolute inset-0 flex items-center justify-center bg-paper-sunken">
            No photo yet
          </span>
        )}
        {images.length > 1 && (
          <span className="tnum t-meta absolute bottom-3 right-3 bg-paper/80 px-2 py-1 text-ink">
            {images.length}
          </span>
        )}
      </Link>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[0.9375rem] leading-snug text-ink">
          <Link
            href={productHref(product)}
            className="link-grow inline-flex min-h-11 items-center"
          >
            {product.name}
          </Link>
        </h3>
        <p className="tnum shrink-0 text-[0.9375rem] text-ink">
          <ProductPrice product={product} />
        </p>
      </div>

      {product.category?.name && <p className="t-meta mt-1.5">{product.category.name}</p>}

      {!linkOnly && (
        <>
          {hasSizes && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a size">
                {product.sizes!.map((s) => {
                  const active = size === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSize(s)
                        setNeedsSize(false)
                      }}
                      aria-pressed={active}
                      className={`tnum flex min-h-11 min-w-11 items-center justify-center border px-2.5 text-[0.6875rem] tracking-wider transition-colors ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line-strong text-ink-dim hover:border-ink hover:text-ink"
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {needsSize && (
                <p role="alert" className="mt-2 text-[0.75rem] text-signal-error">
                  Pick a size first.
                </p>
              )}
            </div>
          )}

          <button type="button" onClick={handleAdd} className="btn btn-ghost mt-4 w-full">
            {added ? (
              <>
                <Check size={14} weight="light" />
                Added
              </>
            ) : (
              "Add to cart"
            )}
          </button>

          <span className="sr-only" role="status">
            {added
              ? `Added ${product.name}${hasSizes && size ? `, size ${size}` : ""} to your cart.`
              : ""}
          </span>
        </>
      )}
    </article>
  )
}
