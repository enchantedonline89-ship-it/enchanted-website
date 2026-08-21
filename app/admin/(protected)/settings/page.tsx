import ThemeSettingsForm from '@/components/admin/ThemeSettingsForm'
import { getD1Database } from '@/lib/cloudflare/d1'
import { normalizeSiteTheme } from '@/lib/site-theme'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const db = await getD1Database()
  let activeTheme: unknown = 'default'
  if (db) {
    try {
      const row = await db
        .prepare('SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1')
        .bind('storefront')
        .first<{ active_theme: string }>()
      activeTheme = row?.active_theme ?? 'default'
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
        <ThemeSettingsForm initialTheme={normalizeSiteTheme(activeTheme)} />
      </section>
    </div>
  )
}
