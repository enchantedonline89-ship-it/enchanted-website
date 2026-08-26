// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseProductCsv } from '@/lib/product-csv'

describe('product CSV parsing', () => {
  it('supports quoted commas, escaped quotes, and Windows line endings', () => {
    expect(parseProductCsv('name,description\r\n"Ruby, Heel","A ""dressy"" shoe"')).toEqual([
      { name: 'Ruby, Heel', description: 'A "dressy" shoe' },
    ])
  })

  it('requires names and limits each upload to 100 products', () => {
    expect(() => parseProductCsv('price\n10')).toThrow(/name column/i)
    const oversized = ['name', ...Array.from({ length: 101 }, (_, index) => `Product ${index}`)].join('\n')
    expect(() => parseProductCsv(oversized)).toThrow(/100 products/i)
  })
})
