import ThemeSettingsForm from '@/components/admin/ThemeSettingsForm'
import { createClient } from '@/lib/supabase/server'
import { normalizeSiteTheme } from '@/lib/site-theme'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_settings')
    .select('active_theme')
    .eq('id', 'storefront')
    .maybeSingle()

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
        <ThemeSettingsForm initialTheme={normalizeSiteTheme(data?.active_theme)} />
      </section>
    </div>
  )
}
