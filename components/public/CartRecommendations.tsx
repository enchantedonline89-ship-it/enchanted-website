'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import RecommendationTracker from '@/components/analytics/RecommendationTracker'
import ProductPrice from '@/components/public/ProductPrice'
import { productHref } from '@/lib/product-url'
import type { Product } from '@/types'

export default function CartRecommendations({
  sourceProductId,
  onNavigate,
}: {
  sourceProductId: string | null
  onNavigate: () => void
}) {
  const [result, setResult] = useState<{ source: string; products: Product[] }>({
    source: '',
    products: [],
  })
  const products = result.source === sourceProductId ? result.products : []

  useEffect(() => {
    if (!sourceProductId) {
      return
    }
    const controller = new AbortController()
    void fetch(`/api/recommendations?source=${encodeURIComponent(sourceProductId)}`, {
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return
      const body = await response.json() as { products?: Product[] }
      setResult({
        source: sourceProductId,
        products: Array.isArray(body.products) ? body.products.slice(0, 2) : [],
      })
    }).catch(() => undefined)
    return () => controller.abort()
  }, [sourceProductId])

  if (!sourceProductId || !products.length) return null

  return (
    <RecommendationTracker
      sourceProductId={sourceProductId}
      recommendedProductIds={products.map(product => product.id)}
      placement="cart"
    >
      <section aria-labelledby="cart-recommendations" className="border-t border-line pt-5">
        <h3 id="cart-recommendations" className="t-meta">Complete the look</h3>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {products.map(product => (
            <li key={product.id} data-recommendation-id={product.id}>
              <Link href={productHref(product)} onClick={onNavigate} className="group block">
                <span className="relative block aspect-[3/4] overflow-hidden bg-paper-sunken">
                  {product.image_url && <Image src={product.image_url} alt="" fill sizes="140px" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />}
                </span>
                <span className="mt-2 block text-xs leading-5 text-ink">{product.name}</span>
                <span className="tnum block text-xs text-ink-dim"><ProductPrice product={product} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </RecommendationTracker>
  )
}
