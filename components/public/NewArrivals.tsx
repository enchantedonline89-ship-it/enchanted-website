'use client'

import ProductCard from '@/components/public/ProductCard'
import type { Product } from '@/types'

interface NewArrivalsProps {
  products: Product[]
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (products.length === 0) return null

  return (
    <section id="new" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-[#c9a84c] text-xs tracking-widest uppercase mb-3">
          Just Dropped
        </p>
        <h2 className="font-display text-4xl lg:text-5xl text-foreground mb-4">
          New Arrivals
        </h2>
        <div className="section-divider" />
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible scrollbar-hide">
        {products.map(product => (
          <div
            key={product.id}
            className="flex-shrink-0 w-56 md:w-auto"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
