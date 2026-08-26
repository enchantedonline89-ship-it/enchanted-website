// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const h = vi.hoisted(() => ({
  authorize: vi.fn(),
  getBucket: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/lib/admin-api', () => ({ authorizeAdminRequest: (...args: unknown[]) => h.authorize(...args) }))
vi.mock('@/lib/admin-catalog-media', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/admin-catalog-media')>()),
  getCatalogMediaBucket: () => h.getBucket(),
  catalogMediaKey: () => 'products/2026-08/11111111-1111-4111-8111-111111111111.jpg',
}))

const media = await import('@/app/api/admin/media/route')
const publicMedia = await import('@/app/media/[...key]/route')

beforeEach(() => {
  vi.clearAllMocks()
  h.authorize.mockResolvedValue({ ok: true, user: { id: 'admin-1', email: 'owner@example.com' }, db: {} })
  h.getBucket.mockResolvedValue({ put: h.put, get: h.get })
  h.put.mockResolvedValue({})
})

describe('admin catalog media route', () => {
  it('does not read the upload when the caller is unauthorized', async () => {
    h.authorize.mockResolvedValue({ ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) })
    const response = await media.POST(new NextRequest('https://shop.example/api/admin/media', { method: 'POST' }))
    expect(response.status).toBe(403)
    expect(h.getBucket).not.toHaveBeenCalled()
  })

  it('writes validated image bytes to R2 and returns a stable same-origin path', async () => {
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'shoe.jpg', { type: 'image/jpeg' }))
    const response = await media.POST(new NextRequest('https://shop.example/api/admin/media', { method: 'POST', body: form }))
    const json = await response.json() as { key: string; url: string }

    expect(response.status).toBe(201)
    expect(h.put).toHaveBeenCalledWith(json.key, expect.any(ArrayBuffer), expect.objectContaining({
      httpMetadata: expect.objectContaining({ contentType: 'image/jpeg' }),
      customMetadata: { uploadedBy: 'admin-1' },
    }))
    expect(json.url).toBe('/media/products/2026-08/11111111-1111-4111-8111-111111111111.jpg')
  })

  it('rejects malformed public media keys before touching R2', async () => {
    const response = await media.GET(new NextRequest('https://shop.example/api/admin/media?key=../../secret'))
    expect(response.status).toBe(400)
    expect(h.getBucket).not.toHaveBeenCalled()
  })

  it('serves valid product media from a crawlable public URL', async () => {
    h.get.mockResolvedValue({
      body: new Uint8Array([0xff, 0xd8, 0xff]),
      httpEtag: 'etag-1',
      writeHttpMetadata(headers: Headers) { headers.set('content-type', 'image/jpeg') },
    })
    const response = await publicMedia.GET(
      new Request('https://shop.example/media/products/2026-08/11111111-1111-4111-8111-111111111111.jpg'),
      { params: Promise.resolve({ key: ['products', '2026-08', '11111111-1111-4111-8111-111111111111.jpg'] }) },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('cache-control')).toContain('immutable')
  })
})
