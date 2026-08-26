import ThemeSettingsForm from '@/components/admin/ThemeSettingsForm'
import { getD1Database } from '@/lib/cloudflare/d1'
import { normalizeSiteTheme, normalizeThemeSchedule } from '@/lib/site-theme'
import type { ThemeSchedule } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const db = await getD1Database()
  let activeTheme: unknown = 'default'
  let schedules: ThemeSchedule[] = [
    normalizeThemeSchedule({ theme: 'christmas', campaign_copy: 'A little Christmas magic, styled for the season.' }),
    normalizeThemeSchedule({ theme: 'ramadan', campaign_copy: 'Ramadan evenings, dressed in gold.' }),
  ]
  if (db) {
    try {
      const [row, scheduleRows] = await Promise.all([
        db.prepare('SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1')
          .bind('storefront').first<{ active_theme: string }>(),
        db.prepare(
          `SELECT theme, starts_at, ends_at, animation_intensity, campaign_copy, is_enabled
           FROM theme_schedules ORDER BY theme`,
        ).all<{
          theme: 'christmas' | 'ramadan'
          starts_at: string | null
          ends_at: string | null
          animation_intensity: 'low' | 'medium' | 'high'
          campaign_copy: string
          is_enabled: number
        }>(),
      ])
      activeTheme = row?.active_theme ?? 'default'
      if (scheduleRows.results.length) {
        schedules = scheduleRows.results.map(item => normalizeThemeSchedule({
          ...item,
          is_enabled: item.is_enabled === 1,
        }))
      }
    } catch (error) {
      console.error('Theme settings read failed:', error)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 max-w-2xl">
        <p className="t-meta">Storefront customization</p>
        <h1 className="mt-2 text-3xl text-ink">Appearance</h1>
        <p className="mt-2 text-sm leading-6 text-ink-dim">
          Switch the visual mood for a holiday without changing product content, navigation, or checkout behavior.
        </p>
      </div>

      <section className="max-w-5xl border border-line bg-paper-raised p-4 sm:p-6">
        <ThemeSettingsForm
          initialTheme={normalizeSiteTheme(activeTheme)}
          initialSchedules={schedules}
        />
      </section>
    </div>
  )
}
