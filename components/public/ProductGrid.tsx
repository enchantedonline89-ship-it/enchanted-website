"use client"

import { useMemo, useState } from "react"
import ProductCard from "./ProductCard"
import CategoryFilter from "./CategoryFilter"
import type { Category, Product } from "@/types"

export default function ProductGrid({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const [active, setActive] = useState("all")

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: products.length }
    for (const cat of categories) {
      map[cat.slug] = products.filter((p) => p.category_id === cat.id).length
    }
    return map
  }, [products, categories])

  const visible = useMemo(() => {
    if (active === "all") return products
    const cat = categories.find((c) => c.slug === active)
    if (!cat) return products
    return products.filter((p) => p.category_id === cat.id)
  }, [active, products, categories])

  return (
    <section id="catalog" className="scroll-mt-[68px] px-5 py-(--spacing-section) lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 border-b border-line pb-1 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h2 className="t-section shrink-0 pb-6 text-ink lg:pb-2.5">The catalog</h2>
          <CategoryFilter
            categories={categories}
            active={active}
            onChange={setActive}
            counts={counts}
          />
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-24">
            <p className="t-section text-ink-dim">Nothing in here yet.</p>
            <p className="t-body">
              This category has no pieces in stock right now. New arrivals land most
              weeks, so try another category or check back shortly.
            </p>
            <button onClick={() => setActive("all")} className="btn btn-ghost mt-2">
              See everything
            </button>
          </div>
        ) : (
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-6 lg:gap-x-8 lg:gap-y-20">
            {visible.map((product, i) => (
              <li key={product.id}>
                <ProductCard product={product} priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
      </div>

    </section>
  )
}
