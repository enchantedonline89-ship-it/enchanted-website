// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))

const { middleware } = await import('@/middleware')

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('middleware without Supabase configuration', () => {
  it('serves the admin login page in production instead of redirecting to itself', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const response = await middleware(new NextRequest('https://shop.example/admin/login'))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects protected admin pages to login in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const response = await middleware(new NextRequest('https://shop.example/admin/dashboard'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://shop.example/admin/login')
  })
})
