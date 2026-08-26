// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  bind: vi.fn(),
  first: vi.fn(),
  getD1Database: vi.fn(),
  prepare: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (reader: () => Promise<unknown>) => reader,
}))

vi.mock('@/lib/cloudflare/d1', () => ({
  getD1Database: h.getD1Database,
}))

const { getSiteTheme, getSiteThemeConfig } = await import('@/lib/site-theme')

beforeEach(() => {
  h.first.mockReset()
  h.bind.mockReturnValue({ first: h.first })
  h.prepare.mockReturnValue({ bind: h.bind })
  h.getD1Database.mockResolvedValue({ prepare: h.prepare })
})

describe('D1 site-theme read', () => {
  it('lets an active schedule override the manual theme with its presentation settings', async () => {
    h.first.mockResolvedValueOnce({
      theme: 'christmas',
      animation_intensity: 'high',
      campaign_copy: 'Christmas edit',
    })

    await expect(getSiteThemeConfig()).resolves.toEqual({
      theme: 'christmas',
      intensity: 'high',
      campaignCopy: 'Christmas edit',
    })
    expect(h.bind).toHaveBeenCalledWith(expect.any(String), expect.any(String))
  })

  it('reads and normalizes the storefront setting with a bound statement', async () => {
    h.first.mockResolvedValue({ active_theme: 'ramadan' })

    await expect(getSiteTheme()).resolves.toBe('ramadan')
    expect(h.prepare).toHaveBeenCalledWith(expect.stringMatching(/FROM site_settings s/i))
    expect(h.bind).toHaveBeenCalledWith('storefront')
  })

  it.each([
    ['a missing binding', null, undefined],
    ['a missing row', { prepare: h.prepare }, null],
    ['an invalid theme', { prepare: h.prepare }, { active_theme: 'halloween' }],
  ])('falls back to default for %s', async (_label, database, row) => {
    h.getD1Database.mockResolvedValueOnce(database)
    h.first.mockResolvedValueOnce(row)

    await expect(getSiteTheme()).resolves.toBe('default')
  })

  it('falls back to default when D1 rejects the query', async () => {
    h.first.mockRejectedValueOnce(new Error('D1 unavailable'))

    await expect(getSiteTheme()).resolves.toBe('default')
  })
})
