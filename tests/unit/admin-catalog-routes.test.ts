// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const h = vi.hoisted(() => ({
  authorize: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deactivateCategory: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deactivateProduct: vi.fn(),
  revalidatePath: vi.fn(),
  db: { prepare: vi.fn(), batch: vi.fn() },
}))

vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: (...args: unknown[]) => h.authorize(...args),
}))
vi.mock('@/lib/admin-catalog', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/admin-catalog')>()),
  createCategory: (...args: unknown[]) => h.createCategory(...args),
  updateCategory: (...args: unknown[]) => h.updateCategory(...args),
  deactivateCategory: (...args: unknown[]) => h.deactivateCategory(...args),
  createProduct: (...args: unknown[]) => h.createProduct(...args),
  updateProduct: (...args: unknown[]) => h.updateProduct(...args),
  deactivateProduct: (...args: unknown[]) => h.deactivateProduct(...args),
}))

const categories = await import('@/app/api/admin/categories/route')
const categoryById = await import('@/app/api/admin/categories/[id]/route')
const products = await import('@/app/api/admin/products/route')
const productById = await import('@/app/api/admin/products/[id]/route')

const id = '11111111-1111-4111-8111-111111111111'
const categoryPayload = {
  name: 'Dresses',
  description: '',
  image_url: '',
  size_system: 'letter_clothing',
  sort_order: 0,
  is_active: true,
}
const productPayload = {
  name: 'Ruby Dress',
  description: '',
  category_id: id,
  sku: '',
  price: '89.99',
  image_url: 'https://cdn.example.test/ruby-dress.webp',
  additional_images: [],
  sizes: ['S', 'M'],
  fit_advice: '',
  materials: '',
  heel_height_cm: '',
  model_note: '',
  is_featured: false,
  is_active: true,
  sort_order: 0,
  colors: [],
  variants: [{ color_ref: null, size: 'S', sku: '', stock_quantity: 2 }],
}

function request(path: string, method: string, body?: unknown) {
  return new NextRequest(`https://shop.example${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'cf-ray': 'request-123' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.authorize.mockResolvedValue({
    ok: true,
    db: h.db,
    user: { id: 'admin-1', email: 'owner@example.com' },
  })
  h.createCategory.mockResolvedValue({ id, name: 'Dresses' })
  h.updateCategory.mockResolvedValue({ id, name: 'Dresses' })
  h.createProduct.mockResolvedValue({ id, name: 'Ruby Dress' })
  h.updateProduct.mockResolvedValue({ id, name: 'Ruby Dress' })
})

describe('admin catalog routes', () => {
  it('stops before validation or D1 when authorization fails', async () => {
    h.authorize.mockResolvedValue({
      ok: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const response = await categories.POST(request('/api/admin/categories', 'POST', categoryPayload))

    expect(response.status).toBe(403)
    expect(h.createCategory).not.toHaveBeenCalled()
  })

  it('returns a bounded validation error for an invalid category', async () => {
    const response = await categories.POST(request('/api/admin/categories', 'POST', {
      ...categoryPayload,
      image_url: 'javascript:alert(1)',
    }))
    const json = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toMatch(/image/i)
    expect(h.createCategory).not.toHaveBeenCalled()
  })

  it('creates a category with the authenticated actor and revalidates the storefront', async () => {
    const response = await categories.POST(request('/api/admin/categories', 'POST', categoryPayload))

    expect(response.status).toBe(201)
    expect(h.createCategory).toHaveBeenCalledWith(
      h.db,
      expect.objectContaining({ name: 'Dresses', description: null }),
      { id: 'admin-1', email: 'owner@example.com' },
      'request-123',
    )
    expect(h.revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('rejects malformed resource IDs before querying D1', async () => {
    const response = await categoryById.PATCH(
      request('/api/admin/categories/not-an-id', 'PATCH', categoryPayload),
      { params: Promise.resolve({ id: 'not-an-id' }) },
    )

    expect(response.status).toBe(400)
    expect(h.updateCategory).not.toHaveBeenCalled()
  })

  it('soft-deactivates a product through the product mutation helper', async () => {
    const response = await productById.DELETE(
      request(`/api/admin/products/${id}`, 'DELETE'),
      { params: Promise.resolve({ id }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deactivated: true })
    expect(h.deactivateProduct).toHaveBeenCalledWith(
      h.db,
      id,
      { id: 'admin-1', email: 'owner@example.com' },
      'request-123',
    )
  })

  it('creates a product only after server validation', async () => {
    const response = await products.POST(request('/api/admin/products', 'POST', productPayload))

    expect(response.status).toBe(201)
    expect(h.createProduct).toHaveBeenCalledWith(
      h.db,
      expect.objectContaining({ name: 'Ruby Dress', price_cents: 8999 }),
      { id: 'admin-1', email: 'owner@example.com' },
      'request-123',
    )
  })
})
