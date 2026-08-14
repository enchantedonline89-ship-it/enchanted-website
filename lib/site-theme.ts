import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { SiteTheme } from '@/types'

export const SITE_THEME_OPTIONS = ['default', 'christmas', 'ramadan'] as const

export function normalizeSiteTheme(value: unknown): SiteTheme {
  return SITE_THEME_OPTIONS.includes(value as SiteTheme)
    ? (value as SiteTheme)
    : 'default'
}

/**
 * Public storefront setting read. This client is deliberately cookie-free so
 * reading the active theme does not make the root layout request-specific.
 * The database policy exposes only the single non-sensitive settings row.
 */
const readSiteTheme = async (): Promise<SiteTheme> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!url.startsWith('https://') || !anonKey) return 'default'

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const { data, error } = await supabase
      .from('site_settings')
      .select('active_theme')
      .eq('id', 'storefront')
      .maybeSingle()

    if (error) return 'default'
    return normalizeSiteTheme(data?.active_theme)
  } catch {
    return 'default'
  }
}

export const getSiteTheme = unstable_cache(readSiteTheme, ['site-theme'], {
  revalidate: 300,
  tags: ['site-settings'],
})
