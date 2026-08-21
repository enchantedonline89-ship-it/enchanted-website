// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  batch: vi.fn(),
  getD1Database: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('@/lib/cloudflare/d1', () => ({
  getD1Database: h.getD1Database,
}))

const { getCatalog } = await import('@/lib/catalog')

const productRow = {
  id: 'shoe-1',
  category_id: 'heels',
  name: 'Evening heel',
  description: 'A polished evening heel.',
  price_cents: 10_000,
  image_url: '/products/evening-heel.jpg',
  additional_images_json: '["/products/evening-heel-side.jpg"]',
  sizes_json: '["38","39"]',
  fit_advice: 'true_to_size',
  materials: 'Satin',
  heel_height_cm: 8.5,
  model_note: null,
  is_featured: 1,
  is_active: 1,
  sort_order: 2,
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z',
  inventory_tracked: 1,
  category_row_id: 'heels',
  category_name: 'Heels & Stilettos',
  category_slug: 'heels-stilettos',
  category_size_system: 'eu_footwear',
  category_description: null,
  category_image_url: '/categories/heels.jpg',
  category_sort_order: 1,
  category_is_active: 1,
  category_created_at: '2026-08-19T00:00:00.000Z',
  category_updated_at: '2026-08-19T00:00:00.000Z',
}

const categoryRow = {
  id: 'heels',
  name: 'Heels & Stilettos',
  slug: 'heels-stilettos',
  size_system: 'eu_footwear',
  description: null,
  image_url: '/categories/heels.jpg',
  sort_order: 1,
  is_active: 1,
  created_at: '2026-08-19T00:00:00.000Z',
  updated_at: '2026-08-19T00:00:00.000Z',
}

const promotionRow = {
  id: 'heels-sale',
  name: 'Heels spotlight',
  description: null,
  campaign_type: 'discount',
  scope: 'category',
  category_id: 'heels',
  discount_basis_points: 2_000,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: null,
  is_active: 1,
  created_at: '2026-08-19T00:00:00.000Z',
  updated_at: '2026-08-19T00:00:00.000Z',
  category_row_id: 'heels',
  category_name: 'Heels & Stilettos',
}

const colorRow = {
  id: 'color-red',
  product_id: 'shoe-1',
  name: 'Ruby Red',
  hex_code: '#b2182b',
  image_url: '/products/evening-heel-red.jpg',
  sort_order: 1,
  is_active: 1,
  created_at: '2026-08-19T00:00:00.000Z',
  updated_at: '2026-08-19T00:00:00.000Z',
}

const variantRows = [
  {
    id: 'variant-red-38',
    product_id: 'shoe-1',
    color_id: 'color-red',
    sku: 'RED-38',
    size: '38',
    stock_quantity: 3,
    is_active: 1,
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
  },
  {
    id: 'variant-red-39',
    product_id: 'shoe-1',
    color_id: 'color-red',
    sku: 'RED-39',
    size: '39',
    stock_quantity: 0,
    is_active: 1,
    created_at: '2026-08-19T00:00:00.000Z',
    updated_at: '2026-08-19T00:00:00.000Z',
  },
]

beforeEach(() => {
  h.prepare.mockImplementation((sql: string) => ({
    bind: vi.fn((...bindings: unknown[]) => ({ bindings, sql })),
  }))
  h.batch.mockResolvedValue([
    { success: true, results: [productRow] },
    { success: true, results: [categoryRow] },
    { success: true, results: [promotionRow] },
    { success: true, results: [colorRow] },
    { success: true, results: variantRows },
  ])
  h.getD1Database.mockResolvedValue({ batch: h.batch, prepare: h.prepare })
})

describe('D1 catalog read', () => {
  it('normalizes commerce rows and applies a category promotion', async () => {
    const catalog = await getCatalog()

    expect(h.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM products AS p'))
    expect(h.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM categories'))
    expect(h.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM promotions AS p'))
    expect(h.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM product_colors AS color'))
    expect(h.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM product_variants AS variant'))
    expect(catalog.source).toBe('live')
    expect(catalog.categories[0]).toMatchObject({
      id: 'heels',
      is_active: true,
      size_system: 'eu_footwear',
    })
    expect(catalog.promotions[0]).toMatchObject({
      category: { id: 'heels', name: 'Heels & Stilettos' },
      discount_percent: 20,
    })
    expect(catalog.products[0]).toMatchObject({
      additional_images: ['/products/evening-heel-side.jpg'],
      category: { id: 'heels', name: 'Heels & Stilettos' },
      discount_percent: 20,
      is_active: true,
      is_featured: true,
      original_price: 100,
      price: 80,
      sizes: ['38', '39'],
      inventory_tracked: true,
      colors: [{
        id: 'color-red',
        name: 'Ruby Red',
        hex_code: '#B2182B',
      }],
      variants: [
        { id: 'variant-red-38', stock_quantity: 3, in_stock: true },
        { id: 'variant-red-39', stock_quantity: 0, in_stock: false },
      ],
    })

    const statements = h.batch.mock.calls[0]?.[0] as Array<{
      bindings: unknown[]
    }>
    expect(statements[0].bindings).toEqual([1])
    expect(statements[1].bindings).toEqual([1])
    expect(statements[2].bindings[0]).toBe(1)
    expect(statements[2].bindings[1]).toBe(statements[2].bindings[2])
    expect(statements[3].bindings).toEqual([1, 1])
    expect(statements[4].bindings).toEqual([1, 1, 1])
  })

  it('returns unavailable without attempting a query when the binding is absent', async () => {
    h.getD1Database.mockResolvedValueOnce(null)

    await expect(getCatalog()).resolves.toEqual({
      products: [],
      categories: [],
      promotions: [],
      source: 'unavailable',
    })
    expect(h.prepare).not.toHaveBeenCalled()
  })

  it('fails closed instead of leaking malformed D1 JSON into the storefront', async () => {
    h.batch.mockResolvedValueOnce([
      {
        success: true,
        results: [{ ...productRow, sizes_json: '{"not":"an array"}' }],
      },
      { success: true, results: [categoryRow] },
      { success: true, results: [promotionRow] },
      { success: true, results: [colorRow] },
      { success: true, results: variantRows },
    ])

    await expect(getCatalog()).resolves.toEqual({
      products: [],
      categories: [],
      promotions: [],
      source: 'unavailable',
    })
  })
})
