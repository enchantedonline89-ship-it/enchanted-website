import { unstable_cache } from 'next/cache'
import { getD1Database } from '@/lib/cloudflare/d1'
import type { SiteTheme } from '@/types'

export const SITE_THEME_OPTIONS = ['default', 'christmas', 'ramadan'] as const

export function normalizeSiteTheme(value: unknown): SiteTheme {
  return SITE_THEME_OPTIONS.includes(value as SiteTheme)
    ? (value as SiteTheme)
    : 'default'
}

/**
 * Public storefront setting read from the production D1 binding. Missing
 * context, query errors, and invalid stored values all fail closed to default.
 */
const readSiteTheme = async (): Promise<SiteTheme> => {
  const database = await getD1Database()
  if (!database) return 'default'

  try {
    const row = await database
      .prepare('SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1')
      .bind('storefront')
      .first<{ active_theme: unknown }>()

    return normalizeSiteTheme(row?.active_theme)
  } catch {
    return 'default'
  }
}

export const getSiteTheme = unstable_cache(readSiteTheme, ['site-theme'], {
  revalidate: 300,
  tags: ['site-settings'],
})
