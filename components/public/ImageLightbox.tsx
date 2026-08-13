"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { X, CaretLeft, CaretRight } from "@phosphor-icons/react/ssr"
import { useOverlay } from "@/lib/use-overlay"
import type { Product } from "@/types"

export default function ImageLightbox({
  product,
  onClose,
  initialIndex = 0,
}: {
  product: Product | null
  onClose: () => void
  /** Open on the frame the caller was looking at, not always the first. */
  initialIndex?: number
}) {
  const [index, setIndex] = useState(initialIndex)

  const images = product
    ? ([product.image_url, ...(product.additional_images ?? [])].filter(Boolean) as string[])
    : []

  const next = useCallback(
    () => setIndex((i) => (i + 1) % Math.max(images.length, 1)),
    [images.length],
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1)),
    [images.length],
  )

  // Jump to the requested frame whenever a different product, or a different
  // starting frame, opens. Adjusted during render rather than in an effect so
  // the lightbox never paints the wrong image first.
  const [lastKey, setLastKey] = useState<string | null>(null)
  const openKey = product ? `${product.id}:${initialIndex}` : null
  if (openKey !== lastKey) {
    setLastKey(openKey)
    if (product && index !== initialIndex) setIndex(initialIndex)
  }

  const dialogRef = useOverlay<HTMLDivElement>(Boolean(product), onClose)

  useEffect(() => {
    if (!product) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [product, next, prev])

  if (!product || images.length === 0) return null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-[80] flex flex-col bg-paper/98"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 lg:px-10">
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] text-ink">{product.name}</p>
          <p className="tnum t-meta mt-0.5">
            {product.price != null ? `$${product.price.toFixed(2)}` : "Price on request"}
          </p>
        </div>
        <button
          onClick={onClose}
          autoFocus
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink"
          aria-label="Close"
        >
          <X size={20} weight="light" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 lg:p-10">
        <div className="relative h-full w-full max-w-3xl">
          <Image
            src={images[index]}
            alt={`${product.name}, image ${index + 1} of ${images.length}`}
            fill
            sizes="(max-width: 1024px) 100vw, 768px"
            className="object-contain"
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 flex h-12 w-12 items-center justify-center border border-line bg-paper/80 text-ink transition-colors hover:border-line-strong lg:left-10"
              aria-label="Previous image"
            >
              <CaretLeft size={18} weight="light" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 flex h-12 w-12 items-center justify-center border border-line bg-paper/80 text-ink transition-colors hover:border-line-strong lg:right-10"
              aria-label="Next image"
            >
              <CaretRight size={18} weight="light" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 border-t border-line px-5 py-4">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={`relative h-14 w-11 overflow-hidden border transition-colors ${
                i === index ? "border-ink" : "border-line hover:border-line-strong"
              }`}
            >
              <Image src={src} alt="" fill sizes="44px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
