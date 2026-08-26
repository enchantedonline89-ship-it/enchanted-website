// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Statement = {
  sql: string
  bindings: unknown[]
  bind: (...values: unknown[]) => Statement
  first: <T>() => Promise<T | null>
}

const h = vi.hoisted(() => {
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement: Statement = {
        sql,
        bindings: [],
        bind(...values: unknown[]) {
          statement.bindings = values
          return statement
        },
        async first<T>() {
          return { active_theme: 'default' } as T
        },
      }
      return statement
    }),
    batch: vi.fn(async (batch: Statement[]) => batch.map(() => ({ success: true, results: [] }))),
  }
  return { db, revalidatePath: vi.fn(), revalidateTag: vi.fn() }
})

vi.mock('next/cache', () => ({
  revalidatePath: h.revalidatePath,
  revalidateTag: h.revalidateTag,
}))
vi.mock('@/lib/admin-api', () => ({
  authorizeAdminRequest: vi.fn(async () => ({
    ok: true,
    db: h.db,
    user: { id: 'admin-id', email: 'owner@example.com', name: 'Owner', role: 'admin' },
  })),
}))

const { PATCH } = await import('@/app/api/admin/settings/theme/route')

function request(theme: unknown) {
  return new NextRequest('https://shop.example/api/admin/settings/theme', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', origin: 'https://shop.example' },
    body: JSON.stringify({
      theme,
      schedules: [
        { theme: 'christmas', starts_at: null, ends_at: null, animation_intensity: 'medium', campaign_copy: 'Christmas', is_enabled: false },
        { theme: 'ramadan', starts_at: null, ends_at: null, animation_intensity: 'medium', campaign_copy: 'Ramadan', is_enabled: false },
      ],
    }),
  })
}

beforeEach(() => {
  h.db.prepare.mockClear()
  h.db.batch.mockClear()
  h.revalidatePath.mockClear()
  h.revalidateTag.mockClear()
})

describe('admin theme settings route', () => {
  it('updates the setting and audit record in one prepared D1 batch', async () => {
    const response = await PATCH(request('christmas'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ theme: 'christmas' })
    const batch = h.db.batch.mock.calls[0][0]
    expect(batch).toHaveLength(4)
    expect(batch[0].sql).toMatch(/INSERT INTO site_settings/i)
    expect(batch[0].bindings).toContain('christmas')
    expect(batch[1].sql).toMatch(/INSERT INTO theme_schedules/i)
    expect(batch[2].sql).toMatch(/INSERT INTO theme_schedules/i)
    expect(batch[3].sql).toMatch(/INSERT INTO admin_audit_logs/i)
    expect(batch[3].bindings).toContain('owner@example.com')
    expect(h.revalidateTag).toHaveBeenCalledWith('site-settings', 'max')
    expect(h.revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('rejects unsupported themes before touching D1', async () => {
    const response = await PATCH(request('halloween'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Choose a valid storefront theme.' })
    expect(h.db.prepare).not.toHaveBeenCalled()
    expect(h.db.batch).not.toHaveBeenCalled()
  })
})
