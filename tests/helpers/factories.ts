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
