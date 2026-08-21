import { describe, expect, it } from 'vitest'
import { validatePromotionInput } from '@/lib/promotion-input'
import {
  applyPromotions,
  discountedPrice,
  promotionForProduct,
  type Promotion,
} from '@/lib/promotions'

const activeDiscount: Promotion = {
  id: 'promo-sitewide',
  name: 'Weekend edit',
  description: null,
  campaign_type: 'discount',
  scope: 'sitewide',
  category_id: null,
  discount_percent: 20,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: null,
  is_active: true,
}

describe('promotion pricing', () => {
  it('rounds a percentage discount to two currency decimals', () => {
    expect(discountedPrice(89.99, 20)).toBe(71.99)
  })

  it('ignores events and applies the largest current discount without stacking', () => {
    const event: Promotion = {
      ...activeDiscount,
      id: 'event-christmas',
      name: 'Christmas collection',
      campaign_type: 'event',
      discount_percent: null,
    }
    const categoryDiscount: Promotion = {
      ...activeDiscount,
      id: 'promo-heels',
      name: 'Heels spotlight',
      scope: 'category',
      category_id: 'heels',
      discount_percent: 25,
    }

    const chosen = promotionForProduct(
      { price: 89.99, category_id: 'heels' },
      [event, activeDiscount, categoryDiscount],
      new Date('2026-08-20T12:00:00.000Z'),
    )
    expect(chosen?.id).toBe('promo-heels')

    const [priced] = applyPromotions(
      [{ id: 'shoe', price: 89.99, category_id: 'heels' }],
      [activeDiscount, categoryDiscount],
      new Date('2026-08-20T12:00:00.000Z'),
    )
    expect(priced.price).toBe(67.49)
    expect(priced.original_price).toBe(89.99)
    expect(priced.discount_percent).toBe(25)
  })

  it('ignores inactive, future, expired, and other-category discounts', () => {
    const product = { price: 100, category_id: 'heels' }
    const now = new Date('2026-08-20T12:00:00.000Z')
    const excluded: Promotion[] = [
      { ...activeDiscount, id: 'inactive', is_active: false },
      { ...activeDiscount, id: 'future', starts_at: '2026-08-21T00:00:00.000Z' },
      { ...activeDiscount, id: 'expired', ends_at: '2026-08-20T12:00:00.000Z' },
      { ...activeDiscount, id: 'dresses', scope: 'category', category_id: 'dresses' },
    ]

    expect(promotionForProduct(product, excluded, now)).toBeNull()
    expect(applyPromotions([product], excluded, now)[0]).toEqual(product)
  })

  it('breaks an equal discount tie in favor of the product category', () => {
    const categoryDiscount: Promotion = {
      ...activeDiscount,
      id: 'category-discount',
      scope: 'category',
      category_id: 'heels',
    }

    expect(promotionForProduct(
      { price: 100, category_id: 'heels' },
      [activeDiscount, categoryDiscount],
      new Date('2026-08-20T12:00:00.000Z'),
    )?.id).toBe('category-discount')
  })
})

describe('promotion input validation', () => {
  it('normalizes an event into a site-wide campaign without a discount', () => {
    const result = validatePromotionInput({
      name: 'Ramadan collection',
      description: 'A seasonal edit',
      campaign_type: 'event',
      scope: 'category',
      category_id: 'ignored',
      discount_percent: 90,
      starts_at: '2026-08-20T12:00:00.000Z',
      ends_at: null,
      is_active: true,
    })
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({
      campaign_type: 'event',
      scope: 'sitewide',
      category_id: null,
      discount_percent: null,
    })
  })

  it('requires a category for category-wide discounts', () => {
    const result = validatePromotionInput({
      name: 'Heels spotlight',
      campaign_type: 'discount',
      scope: 'category',
      category_id: '',
      discount_percent: 15,
      starts_at: '2026-08-20T12:00:00.000Z',
      is_active: true,
    })
    expect(result.error).toBe('Choose a category for this discount.')
  })

  it('rejects invalid discount percentages', () => {
    const result = validatePromotionInput({
      name: 'Impossible sale',
      campaign_type: 'discount',
      scope: 'sitewide',
      discount_percent: 101,
      starts_at: '2026-08-20T12:00:00.000Z',
      is_active: true,
    })
    expect(result.error).toContain('no more than 100%')
  })

  it('rejects an event whose end is not after its start', () => {
    const result = validatePromotionInput({
      name: 'One instant event',
      campaign_type: 'event',
      starts_at: '2026-08-20T12:00:00.000Z',
      ends_at: '2026-08-20T12:00:00.000Z',
    })

    expect(result.error).toBe('End time must be after the start time.')
  })
})
