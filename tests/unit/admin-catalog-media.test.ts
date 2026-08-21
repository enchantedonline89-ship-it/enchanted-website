// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { catalogMediaKey, validateCatalogImage } from '@/lib/admin-catalog-media'

function file(bytes: number[], type: string, name = 'image.bin') {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('catalog media validation', () => {
  it('accepts a JPEG only when its magic bytes match its declared type', async () => {
    const result = await validateCatalogImage(file([0xff, 0xd8, 0xff, 0xe0, 0, 0], 'image/jpeg', 'shoe.jpg'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.extension).toBe('jpg')
  })

  it('rejects a file whose declared image type does not match its bytes', async () => {
    const result = await validateCatalogImage(file([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], 'image/png', 'attack.png'))
    expect(result).toEqual({ ok: false, error: 'The file contents do not match its image type.' })
  })

  it('generates bounded product media keys without retaining the client filename', () => {
    expect(catalogMediaKey('webp', new Date('2026-08-21T10:00:00Z'), '11111111-1111-4111-8111-111111111111'))
      .toBe('products/2026-08/11111111-1111-4111-8111-111111111111.webp')
  })
})
