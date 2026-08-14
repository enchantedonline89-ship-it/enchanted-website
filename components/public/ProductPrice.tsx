import type { Product } from '@/types'
import { pricePresentation } from '@/lib/promotions'

export default function ProductPrice({
  product,
  askLabel = 'Ask',
  showEvent = true,
}: {
  product: Product
  askLabel?: string
  showEvent?: boolean
}) {
  const { price, originalPrice, discountPercent, promotionName } = pricePresentation(product)
  if (price == null) return <span>{askLabel}</span>

  return (
    <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
      {originalPrice != null && originalPrice > price && (
        <del className="tnum text-[0.8em] text-ink-faint">${originalPrice.toFixed(2)}</del>
      )}
      <span className="tnum">${price.toFixed(2)}</span>
      {discountPercent != null && (
        <span className="bg-signal-ok/10 px-1.5 py-0.5 text-[0.6875rem] text-signal-ok">
          {Number(discountPercent).toLocaleString()}% off
        </span>
      )}
      {showEvent && promotionName && <span className="sr-only">during {promotionName}</span>}
    </span>
  )
}
