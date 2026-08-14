import type { Product } from '@/types'

export type PromotionScope = 'sitewide' | 'category'
export type CampaignType = 'event' | 'discount'

export interface Promotion {
  id: string
  name: string
  description: string | null
  campaign_type: CampaignType
  scope: PromotionScope
  category_id: string | null
  discount_percent: number | null
  starts_at: string
  ends_at: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  category?: { id: string; name: string } | null
}

export interface PromotionPrice {
  original_price?: number | null
  discount_percent?: number | null
  promotion_name?: string | null
}

type PriceableProduct = Pick<Product, 'price' | 'category_id'>

function isCurrent(promotion: Promotion, now: Date): boolean {
  if (!promotion.is_active) return false
  const start = Date.parse(promotion.starts_at)
  const end = promotion.ends_at ? Date.parse(promotion.ends_at) : null
  if (!Number.isFinite(start) || start > now.getTime()) return false
  return end === null || (Number.isFinite(end) && end > now.getTime())
}

/**
 * Resolve one promotion deterministically. Discounts never stack: the largest
 * valid percentage wins, and a category promotion wins an equal-percentage tie.
 */
export function promotionForProduct(
  product: PriceableProduct,
  promotions: Promotion[],
  now = new Date(),
): Promotion | null {
  return promotions
    .filter(
      (promotion) =>
        isCurrent(promotion, now) &&
        promotion.campaign_type === 'discount' &&
        promotion.discount_percent != null &&
        (promotion.scope === 'sitewide' ||
          (promotion.scope === 'category' && promotion.category_id === product.category_id)),
    )
    .sort((a, b) => {
      const byDiscount = Number(b.discount_percent) - Number(a.discount_percent)
      if (byDiscount !== 0) return byDiscount
      if (a.scope !== b.scope) return a.scope === 'category' ? -1 : 1
      return a.name.localeCompare(b.name)
    })[0] ?? null
}

export function discountedPrice(price: number, discountPercent: number): number {
  return Number((price * (1 - discountPercent / 100)).toFixed(2))
}

/** Return storefront products with `price` replaced by the effective sell price. */
export function applyPromotions<T extends PriceableProduct>(
  products: T[],
  promotions: Promotion[],
  now = new Date(),
): Array<T & PromotionPrice> {
  return products.map((product) => {
    const basePrice = product.price
    if (basePrice == null || !Number.isFinite(Number(basePrice))) return product

    const promotion = promotionForProduct(product, promotions, now)
    if (!promotion) return product

    const originalPrice = Number(basePrice)
    return {
      ...product,
      price: discountedPrice(originalPrice, Number(promotion.discount_percent)),
      original_price: originalPrice,
      discount_percent: Number(promotion.discount_percent),
      promotion_name: promotion.name,
    }
  })
}

export function pricePresentation(product: Product): {
  price: number | null
  originalPrice: number | null
  discountPercent: number | null
  promotionName: string | null
} {
  const priced = product as Product & PromotionPrice
  return {
    price: product.price,
    originalPrice: priced.original_price ?? null,
    discountPercent: priced.discount_percent ?? null,
    promotionName: priced.promotion_name ?? null,
  }
}
