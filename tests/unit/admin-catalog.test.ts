// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  deactivateProduct,
  validateCategoryInput,
  validateProductInput,
} from '@/lib/admin-catalog'
import type { CatalogDatabase } from '@/lib/admin-catalog'

describe('admin catalog input validation', () => {
  it('normalizes a valid category payload', () => {
    const result = validateCategoryInput({
      name: '  Evening Dresses  ',
      description: '  Occasion-ready pieces. ',
      image_url: 'https://cdn.example.test/category.webp',
      size_system: 'letter_clothing',
      sort_order: 4,
      is_active: true,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Evening Dresses',
        description: 'Occasion-ready pieces.',
        image_url: 'https://cdn.example.test/category.webp',
        size_system: 'letter_clothing',
        sort_order: 4,
        is_active: true,
      },
    })
  })

  it.each([
    [{ name: 'x', size_system: 'none', sort_order: 0, is_active: true }, /name/i],
    [{ name: 'Dresses', image_url: 'javascript:alert(1)', size_system: 'none', sort_order: 0, is_active: true }, /image/i],
    [{ name: 'Dresses', size_system: 'made_up', sort_order: 0, is_active: true }, /size system/i],
    [{ name: 'Dresses', size_system: 'none', sort_order: -1, is_active: true }, /sort order/i],
  ])('rejects an invalid category payload', (payload, message) => {
    const result = validateCategoryInput(payload)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(message)
  })

  it('normalizes price, color, and stock data without floating-point currency', () => {
    const result = validateProductInput({
      name: '  Ruby Satin Heel ',
      description: ' A formal heel. ',
      category_id: '11111111-1111-4111-8111-111111111111',
      sku: ' ruby-heel-01 ',
      price: '89.99',
      image_url: 'https://cdn.example.test/cover.webp',
      additional_images: ['https://cdn.example.test/detail.webp'],
      sizes: ['37', '38'],
      fit_advice: 'true_to_size',
      materials: ' Satin ',
      heel_height_cm: '8.5',
      model_note: '',
      is_featured: true,
      is_active: true,
      sort_order: 2,
      colors: [
        {
          ref: 'ruby',
          name: ' Ruby Red ',
          hex_code: '#b2182b',
          image_url: '',
          sort_order: 0,
        },
      ],
      variants: [
        { color_ref: 'ruby', size: '37', sku: 'RUBY-37', stock_quantity: 3 },
        { color_ref: 'ruby', size: '38', sku: '', stock_quantity: 0 },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.price_cents).toBe(8999)
    expect(result.value.name).toBe('Ruby Satin Heel')
    expect(result.value.sku).toBe('RUBY-HEEL-01')
    expect(result.value.colors[0]).toMatchObject({
      ref: 'ruby',
      name: 'Ruby Red',
      hex_code: '#B2182B',
      image_url: null,
    })
    expect(result.value.variants).toEqual([
      { color_ref: 'ruby', size: '37', sku: 'RUBY-37', stock_quantity: 3 },
      { color_ref: 'ruby', size: '38', sku: null, stock_quantity: 0 },
    ])
  })

  it.each([
    ['fractional cents', { price: '12.345' }, /two decimal/i],
    ['duplicate color hex', {
      colors: [
        { ref: 'one', name: 'Ruby', hex_code: '#B2182B', sort_order: 0 },
        { ref: 'two', name: 'Wine', hex_code: '#b2182b', sort_order: 1 },
      ],
    }, /hex/i],
    ['unknown color', {
      colors: [{ ref: 'ruby', name: 'Ruby', hex_code: '#B2182B', sort_order: 0 }],
      variants: [{ color_ref: 'missing', size: '38', stock_quantity: 1 }],
    }, /color/i],
    ['unknown size', {
      sizes: ['38'],
      variants: [{ color_ref: null, size: '39', stock_quantity: 1 }],
    }, /size/i],
    ['negative stock', {
      sizes: ['38'],
      variants: [{ color_ref: null, size: '38', stock_quantity: -1 }],
    }, /stock/i],
    ['unsafe image', { image_url: 'data:image/svg+xml,<svg onload=alert(1)>' }, /image/i],
  ])('rejects %s', (_name, overrides, message) => {
    const base = {
      name: 'Ruby Satin Heel',
      description: '',
      category_id: null,
      sku: '',
      price: '89.99',
      image_url: '',
      additional_images: [],
      sizes: ['37', '38'],
      fit_advice: '',
      materials: '',
      heel_height_cm: '',
      model_note: '',
      is_featured: false,
      is_active: true,
      sort_order: 0,
      colors: [],
      variants: [],
      ...overrides,
    }

    const result = validateProductInput(base)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(message)
  })
})

describe('catalog mutation safety', () => {
  it('deactivates products without issuing destructive DELETE statements', async () => {
    const batchedSql: string[] = []
    const productRow = {
      id: '11111111-1111-4111-8111-111111111111',
      category_id: null,
      slug: 'ruby-dress',
      sku: null,
      name: 'Ruby Dress',
      description: null,
      price_cents: 8999,
      image_key: null,
      image_url: null,
      additional_images_json: '[]',
      sizes_json: '[]',
      fit_advice: null,
      materials: null,
      heel_height_cm: null,
      model_note: null,
      is_featured: 0,
      is_active: 1,
      sort_order: 0,
      created_at: '2026-08-21',
      updated_at: '2026-08-21',
    }
    const db = {
      prepare(sql: string) {
        const statement = {
          sql,
          bind: () => statement,
          first: async () => sql.includes('FROM products p') ? productRow : null,
          all: async () => ({ results: [] }),
        }
        return statement
      },
      async batch(statements: Array<{ sql: string }>) {
        batchedSql.push(...statements.map(statement => statement.sql))
        return []
      },
    } as unknown as CatalogDatabase

    await deactivateProduct(db, productRow.id, { id: 'admin-1', email: 'owner@example.com' })

    expect(batchedSql.join('\n')).toMatch(/UPDATE products SET is_active = 0/i)
    expect(batchedSql.join('\n')).not.toMatch(/\bDELETE\b/i)
    expect(batchedSql.join('\n')).toMatch(/INSERT INTO admin_audit_logs/i)
  })
})
