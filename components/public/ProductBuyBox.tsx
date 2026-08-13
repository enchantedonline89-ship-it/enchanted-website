"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check } from "@phosphor-icons/react/ssr"
import { useCart } from "@/lib/cart-context"
import SizeGuideSheet from "./SizeGuideSheet"
import { buildProductEnquiryURL } from "@/lib/whatsapp"
import { productHref } from "@/lib/product-url"
import type { Product, SizeSystem } from "@/types"

const FIT_COPY: Record<string, string> = {
  size_up: "This style runs small. We recommend taking one size up.",
  size_down: "This style runs large. We recommend taking one size down.",
  true_to_size: "This style runs true to size.",
}

export default function ProductBuyBox({
  product,
  sizeSystem,
}: {
  product: Product
  sizeSystem: SizeSystem
}) {
  const { addToCart, openCart } = useCart()
  const hasSizes = Boolean(product.sizes?.length)

  // Never preselected. A preselected size is a wrong-size-order generator, and
  // a wrong size here costs the owner the item and both delivery legs.
  const [size, setSize] = useState<string | null>(null)
  const [needsSize, setNeedsSize] = useState(false)
  const [added, setAdded] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Sizes are expected but none are set: a data hole, not an empty state.
  // Route to a human rather than rendering an empty size row.
  const sizesMissing = !hasSizes && sizeSystem !== "none"

  function handleAdd() {
    if (hasSizes && !size) {
      setNeedsSize(true)
      return
    }
    addToCart(product, hasSizes ? size : null)
    setNeedsSize(false)
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), 2400)
  }

  const enquiry = buildProductEnquiryURL(product.name, size, productHref(product))

  return (
    <div className="mt-8">
      {hasSizes && (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <span className="t-meta">Size</span>
            {sizeSystem !== "none" && (
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="t-meta link-grow inline-flex min-h-11 items-center text-ink-dim hover:text-ink"
              >
                Size guide
              </button>
            )}
          </div>

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Choose a size"
          >
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
                  className={`tnum flex min-h-11 min-w-11 items-center justify-center border px-3 text-[0.8125rem] transition-colors ${
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
            <p role="alert" className="mt-2 text-[0.8125rem] text-signal-error">
              Pick a size first.
            </p>
          )}
        </>
      )}

      {product.fit_advice && FIT_COPY[product.fit_advice] && (
        <p className="mt-4 text-[0.9375rem] text-ink-dim">
          {FIT_COPY[product.fit_advice]}
        </p>
      )}

      {sizesMissing ? (
        <a
          href={enquiry}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-gold mt-6 w-full"
        >
          Ask about sizes
        </a>
      ) : (
        <button type="button" onClick={handleAdd} className="btn btn-gold mt-6 w-full">
          Add to cart
        </button>
      )}

      {/* Announced once, not by relabelling the button. */}
      <span className="sr-only" role="status">
        {added ? `Added ${product.name}${size ? `, size ${size}` : ""} to your cart.` : ""}
      </span>

      {added && (
        <p className="mt-3 flex items-center gap-2 text-[0.875rem] text-ink">
          <Check size={14} weight="light" className="text-signal-ok" />
          Added.
          <button
            type="button"
            onClick={openCart}
            className="link-grow text-ink underline-offset-4"
          >
            View cart
          </button>
        </p>
      )}

      <dl className="mt-8 border-t border-line text-[0.8125rem] text-ink-dim">
        <div className="flex items-center justify-between gap-4 border-b border-line py-1">
          <dt>Payment</dt>
          <dd className="text-right text-ink">Cash on delivery, no card needed</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-line py-1">
          <dt>Delivery</dt>
          <dd className="tnum text-right text-ink">
            <Link href="/shipping" className="link-grow inline-flex min-h-11 items-center">
              $3 in Beirut, $4 elsewhere in Lebanon
            </Link>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-line py-1">
          <dt>Returns</dt>
          <dd className="tnum text-right text-ink">
            <Link href="/returns" className="link-grow inline-flex min-h-11 items-center">
              10 days, unworn with tags
            </Link>
          </dd>
        </div>
      </dl>

      {/* Subordinate on purpose. Gold button buys, plain link asks: a WhatsApp
          order would skip the database row, the account and the server-side
          fee validation. */}
      <p className="mt-5 text-[0.875rem]">
        <a
          href={enquiry}
          target="_blank"
          rel="noopener noreferrer"
          className="link-grow text-gold-deep"
        >
          Ask a question about this piece on WhatsApp
        </a>
      </p>

      <SizeGuideSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        system={sizeSystem}
      />
    </div>
  )
}
