import { unstable_cache } from 'next/cache'
import { getD1Database } from '@/lib/cloudflare/d1'
import type { SiteTheme, SiteThemeConfig, ThemeIntensity, ThemeSchedule } from '@/types'

export const SITE_THEME_OPTIONS = ['default', 'christmas', 'ramadan'] as const
export const THEME_INTENSITY_OPTIONS = ['low', 'medium', 'high'] as const

export function normalizeSiteTheme(value: unknown): SiteTheme {
  return SITE_THEME_OPTIONS.includes(value as SiteTheme) ? value as SiteTheme : 'default'
}

export function normalizeThemeIntensity(value: unknown): ThemeIntensity {
  return THEME_INTENSITY_OPTIONS.includes(value as ThemeIntensity)
    ? value as ThemeIntensity
    : 'medium'
}

function config(
  theme: unknown,
  intensity: unknown = 'medium',
  campaignCopy: unknown = '',
): SiteThemeConfig {
  return {
    theme: normalizeSiteTheme(theme),
    intensity: normalizeThemeIntensity(intensity),
    campaignCopy: typeof campaignCopy === 'string' ? campaignCopy.trim().slice(0, 120) : '',
  }
}

const readSiteThemeConfig = async (): Promise<SiteThemeConfig> => {
  const database = await getD1Database()
  if (!database) return config('default')

  try {
    const now = new Date().toISOString()
    const scheduled = await database.prepare(
      `SELECT theme, animation_intensity, campaign_copy
       FROM theme_schedules
       WHERE is_enabled = 1 AND starts_at <= ? AND ends_at > ?
       ORDER BY starts_at DESC LIMIT 1`,
    ).bind(now, now).first<{
      theme: unknown
      animation_intensity: unknown
      campaign_copy: unknown
    }>()
    if (scheduled && normalizeSiteTheme(scheduled.theme) !== 'default') {
      return config(scheduled.theme, scheduled.animation_intensity, scheduled.campaign_copy)
    }

    const manual = await database.prepare(
      `SELECT s.active_theme, t.animation_intensity, t.campaign_copy
       FROM site_settings s
       LEFT JOIN theme_schedules t ON t.theme = s.active_theme
       WHERE s.id = ? LIMIT 1`,
    ).bind('storefront').first<{
      active_theme: unknown
      animation_intensity: unknown
      campaign_copy: unknown
    }>()
    return config(manual?.active_theme, manual?.animation_intensity, manual?.campaign_copy)
  } catch (error) {
    if (!(error instanceof Error && /no such table:\s*theme_schedules/i.test(error.message))) {
      return config('default')
    }
    try {
      const row = await database.prepare(
        'SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1',
      ).bind('storefront').first<{ active_theme: unknown }>()
      return config(row?.active_theme)
    } catch {
      return config('default')
    }
  }
}

export const getSiteThemeConfig = unstable_cache(readSiteThemeConfig, ['site-theme'], {
  // Keep scheduled campaign switches close to their configured start/end time.
  revalidate: 60,
  tags: ['site-settings'],
})

export async function getSiteTheme(): Promise<SiteTheme> {
  return (await getSiteThemeConfig()).theme
}

export function normalizeThemeSchedule(value: Partial<ThemeSchedule>): ThemeSchedule {
  return {
    theme: value.theme === 'ramadan' ? 'ramadan' : 'christmas',
    starts_at: typeof value.starts_at === 'string' && value.starts_at ? value.starts_at : null,
    ends_at: typeof value.ends_at === 'string' && value.ends_at ? value.ends_at : null,
    animation_intensity: normalizeThemeIntensity(value.animation_intensity),
    campaign_copy: typeof value.campaign_copy === 'string' ? value.campaign_copy.slice(0, 120) : '',
    is_enabled: value.is_enabled === true,
  }
}
