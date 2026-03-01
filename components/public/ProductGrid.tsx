'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import CategoryFilter from '@/components/public/CategoryFilter'
import ProductCard from '@/components/public/ProductCard'
import type { Product, Category } from '@/types'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
}

export default function ProductGrid({ products, categories }: ProductGridProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const isFirstFilterRender = useRef(true)

  const filtered = activeSlug
    ? products.filter((p) => p.category?.slug === activeSlug)
    : products

  // Initial ScrollTrigger animation on mount
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    gsap.fromTo(
      '.product-card-item',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.product-grid',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  // Re-trigger animation on filter change (skip initial mount)
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    // Small delay to let React re-render the filtered items first
    const timer = setTimeout(() => {
      gsap.fromTo(
        '.product-card-item',
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
        }
      )
    }, 50)

    return () => clearTimeout(timer)
  }, [activeSlug])

  return (
    <section id="catalog" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-[#c9a84c] text-xs tracking-widest uppercase mb-3">
          Our Collection
        </p>
        <h2 className="font-display text-4xl lg:text-5xl text-foreground mb-4">
          Shop the Edit
        </h2>
        <div className="section-divider" />
      </div>

      {/* Category filter */}
      <CategoryFilter
        categories={categories}
        activeSlug={activeSlug}
        onSelect={setActiveSlug}
      />

      {/* Product grid */}
      {filtered.length > 0 ? (
        <div className="product-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {filtered.map((p) => (
            <div key={p.id} className="product-card-item">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted py-20">
          No products in this category yet.
        </p>
      )}
    </section>
  )
}
