'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import type { Product } from '@/types'
import ImageLightbox from '@/components/public/ImageLightbox'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.additional_images ?? []),
  ]
  const hasGallery = allImages.length > 1

  const { addToCart, openCart } = useCart()
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasSizes = product.sizes && product.sizes.length > 0

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.transform = `rotateY(${x * 15}deg) rotateX(${-y * 15}deg) scale3d(1.02, 1.02, 1.02)`
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)'
  }

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) return
    addToCart(product, selectedSize)
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    setAdded(true)
    openCart()
    addedTimerRef.current = setTimeout(() => setAdded(false), 1500)
  }

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    }
  }, [])

  return (
    <div style={{ perspective: '1000px' }}>
      <div
        ref={cardRef}
        className="product-card-inner rounded-xl overflow-hidden bg-card border border-border group cursor-pointer transition-transform duration-200"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image section — aspect-ratio based for consistent sizing across all screen widths */}
        <div
          className={`relative overflow-hidden ${hasGallery ? 'cursor-zoom-in' : ''}`}
          style={{ aspectRatio: '3/4' }}
          onClick={hasGallery ? () => setLightboxIndex(0) : undefined}
        >
          {!imgError && product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-surface flex items-center justify-center">
              <svg className="w-12 h-12 text-subtle" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            </div>
          )}

          {product.is_featured && (
            <span className="absolute top-2 left-2 bg-[#c9a84c] text-black text-xs px-2 py-1 uppercase tracking-wider font-medium rounded z-10">
              Featured
            </span>
          )}

          <div className="product-card-shine rounded-xl" />
        </div>

        {/* Content section */}
        <div className="p-4">
          {product.category?.name && (
            <p className="text-xs text-muted uppercase tracking-widest mb-1">
              {product.category.name}
            </p>
          )}

          <h3 className="font-display text-foreground text-lg leading-tight mb-2">
            {product.name}
          </h3>

          <p className="text-[#c9a84c] font-medium">
            {formatPrice(product.price)}
          </p>

          {/* COD badge */}
          <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 mt-1.5">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Cash on Delivery
          </span>

          {/* Size picker — min 44px touch target on mobile via padding */}
          {hasSizes && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.sizes!.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(prev => prev === size ? null : size)}
                  data-hover
                  className={`text-[10px] sm:text-[10px] px-2.5 py-1.5 sm:px-1.5 sm:py-0.5 min-h-[36px] sm:min-h-0 rounded uppercase tracking-wide border transition-all duration-150 touch-manipulation ${
                    selectedSize === size
                      ? 'bg-[#c9a84c] border-[#c9a84c] text-black font-semibold'
                      : 'text-muted border-border hover:border-[#c9a84c] hover:text-[#c9a84c]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {/* Add to Cart button — minimum 44px height for touch targets */}
          <button
            onClick={handleAddToCart}
            disabled={hasSizes ? !selectedSize : false}
            data-hover
            className={`mt-3 w-full flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-semibold py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 rounded-lg transition-all duration-200 active:scale-95 touch-manipulation ${
              added
                ? 'bg-green-600 text-white'
                : hasSizes && !selectedSize
                ? 'bg-border text-subtle cursor-not-allowed'
                : 'bg-[#c9a84c] hover:bg-[#f0d060] text-black'
            }`}
          >
            {added ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                </svg>
                {hasSizes && !selectedSize ? 'Select a size' : 'Add to Cart'}
              </>
            )}
          </button>

          <p className="text-[10px] text-muted text-center mt-2">Free returns within 14 days</p>
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
