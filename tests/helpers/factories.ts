import type { Category, Product } from '@/types'

let seq = 0

export function makeCategory(overrides: Partial<Category> = {}): Category {
  seq += 1
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
  return {
    id: `cat-${seq}`,
    name: 'Heels & Stilettos',
    slug: 'heels-stilettos',
    description: null,
    image_url: null,
    sort_order: seq,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/** A product that requires a size choice (clothing / footwear). */
export function makeSizedProduct(overrides: Partial<Product> = {}): Product {
  seq += 1
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
  return {
    id: `p-${seq}`,
    category_id: 'cat-1',
    name: 'Velvet Gold-Strap Stiletto',
    description: null,
    price: 89.99,
    image_url: 'https://example.test/stiletto.jpg',
    additional_images: null,
    sizes: ['36', '37', '38'],
    is_featured: false,
    is_active: true,
    sort_order: seq,
    created_at: now,
    updated_at: now,
    category: null,
    ...overrides,
  }
}

/** An accessory: `sizes: null`, so it must be addable without picking a size. */
export function makeAccessory(overrides: Partial<Product> = {}): Product {
  return makeSizedProduct({
    name: 'Crystal Hair Claw Clip',
    price: 29.99,
    sizes: null,
    image_url: 'https://example.test/clip.jpg',
    ...overrides,
  })
}

/** A variant-managed product used to exercise real color/stock behavior. */
export function makeColorProduct(overrides: Partial<Product> = {}): Product {
  const {
    colors: overrideColors,
    variants: overrideVariants,
    ...productOverrides
  } = overrides
  const product = makeSizedProduct({
    id: 'p-color',
    sizes: ['36', '37', '38'],
    inventory_tracked: true,
    ...productOverrides,
  })
  const timestamp = '2026-01-01T00:00:00.000Z'
  const colors = [
    {
      id: 'color-red',
      product_id: product.id,
      name: 'Ruby Red',
      hex_code: '#B2182B',
      image_url: null,
      sort_order: 1,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: 'color-blue',
      product_id: product.id,
      name: 'Midnight Blue',
      hex_code: '#14213D',
      image_url: null,
      sort_order: 2,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]
  const variants = [
    {
      id: 'variant-red-36',
      product_id: product.id,
      color_id: 'color-red',
      sku: 'RED-36',
      size: '36',
      stock_quantity: 2,
      in_stock: true,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: 'variant-red-37',
      product_id: product.id,
      color_id: 'color-red',
      sku: 'RED-37',
      size: '37',
      stock_quantity: 0,
      in_stock: false,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: 'variant-blue-38',
      product_id: product.id,
      color_id: 'color-blue',
      sku: 'BLUE-38',
      size: '38',
      stock_quantity: 4,
      in_stock: true,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]

  return {
    ...product,
    colors: overrideColors ?? colors,
    variants: overrideVariants ?? variants,
  }
}
