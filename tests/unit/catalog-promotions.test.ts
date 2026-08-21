// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  from: vi.fn(),
  promotionSelect: vi.fn(),
}))

vi.mock('@/lib/mock-data', () => ({
  isSupabaseMockMode: () => false,
  mockCategories: [],
  mockProducts: [],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: h.from }),
}))

const { getCatalog } = await import('@/lib/catalog')

beforeEach(() => {
  h.promotionSelect.mockClear()
  h.from.mockImplementation((table: string) => {
    if (table === 'products') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async () => ({
                data: [{
                  id: 'shoe-1',
                  name: 'Evening heel',
                  price: 100,
                  category_id: 'heels',
                  is_active: true,
                  sizes: ['38'],
                  created_at: '2026-08-20T00:00:00.000Z',
                }],
                error: null,
              }),
            }),
          }),
        }),
      }
    }

    if (table === 'categories') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [{ id: 'heels', name: 'Heels & Stilettos' }],
              error: null,
            }),
          }),
        }),
      }
    }

    return {
      select: h.promotionSelect.mockImplementation(() => ({
        eq: () => ({
          lte: () => ({
            or: async () => ({
              data: [{
                id: 'heels-sale',
                name: 'Heels spotlight',
                description: null,
                campaign_type: 'discount',
                scope: 'category',
                category_id: 'heels',
                discount_percent: 20,
                starts_at: '2026-01-01T00:00:00.000Z',
                ends_at: null,
                is_active: true,
                category: [{ id: 'heels', name: 'Heels & Stilettos' }],
              }],
              error: null,
            }),
          }),
        }),
      })),
    }
  })
})

describe('catalog promotion wiring', () => {
  it('keeps the category name needed by category-wide offer messaging', async () => {
    const catalog = await getCatalog()

    expect(h.promotionSelect).toHaveBeenCalledWith(
      expect.stringContaining('category:categories'),
    )
    expect(catalog.promotions[0].category).toEqual({
      id: 'heels',
      name: 'Heels & Stilettos',
    })
    expect(catalog.products[0].price).toBe(80)
  })
})
