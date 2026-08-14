'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MoonStars, Snowflake, Sparkle } from '@phosphor-icons/react/ssr'
import { createClient } from '@/lib/supabase/client'
import type { SiteTheme } from '@/types'

const THEMES: Array<{
  id: SiteTheme
  name: string
  description: string
  Icon: typeof Sparkle
  swatches: [string, string, string]
}> = [
  {
    id: 'default',
    name: 'Enchanted',
    description: 'The classic white, ink and gold storefront.',
    Icon: Sparkle,
    swatches: ['#ffffff', '#14120e', '#f0c068'],
  },
  {
    id: 'christmas',
    name: 'Christmas',
    description: 'Warm winter color, a logo hat and lightweight snowfall.',
    Icon: Snowflake,
    swatches: ['#fffaf5', '#8b2430', '#234c35'],
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    description: 'A moonlit navy and gold treatment with a crescent ornament.',
    Icon: MoonStars,
    swatches: ['#fffaf0', '#182642', '#c99332'],
  },
]

export default function ThemeSettingsForm({ initialTheme }: { initialTheme: SiteTheme }) {
  const router = useRouter()
  const [theme, setTheme] = useState<SiteTheme>(initialTheme)
  const [savedTheme, setSavedTheme] = useState<SiteTheme>(initialTheme)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('SESSION_EXPIRED')

      const before = { active_theme: savedTheme }
      const { data, error: settingsError } = await supabase
        .from('site_settings')
        .upsert({
          id: 'storefront',
          active_theme: theme,
        }, { onConflict: 'id' })
        .select()
        .single()

      if (settingsError) throw settingsError

      const { error: logError } = await supabase.from('admin_logs').insert({
        admin_email: user.email ?? 'unknown',
        action: 'UPDATE',
        entity_type: 'site_setting',
        entity_id: null,
        entity_name: 'Storefront theme',
        changes: { before, after: data },
      })
      if (logError) throw new Error('AUDIT_LOG_FAILED')

      const response = await fetch('/api/revalidate', { method: 'POST' })
      if (!response.ok) throw new Error('REVALIDATION_FAILED')

      setSavedTheme(theme)
      setMessage(`${THEMES.find(item => item.id === theme)?.name ?? 'Theme'} is now live.`)
      router.refresh()
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'unknown'
      if (detail === 'SESSION_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (detail === 'AUDIT_LOG_FAILED') {
        setError('The theme changed, but the audit entry failed. Please contact support.')
      } else if (detail === 'REVALIDATION_FAILED') {
        setError('The theme changed, but the storefront refresh failed. Refresh the shop manually.')
      } else if (detail.includes('site_settings') || detail.includes('schema cache')) {
        setError('Theme storage is not ready yet. Apply the site settings database migration, then try again.')
      } else {
        setError(`Could not save the theme: ${detail}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-ink">Active storefront theme</legend>
        <p className="mt-1 text-sm text-ink-dim">
          The selected design appears across customer-facing pages. Admin pages stay neutral.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {THEMES.map(({ id, name, description, Icon, swatches }) => {
            const selected = theme === id
            return (
              <label
                key={id}
                className={`relative cursor-pointer border p-5 transition-colors ${
                  selected
                    ? 'border-ink bg-paper-sunken'
                    : 'border-line bg-paper-raised hover:border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="site-theme"
                  value={id}
                  checked={selected}
                  onChange={() => setTheme(id)}
                  className="peer sr-only"
                />
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center border border-line-strong">
                  {selected && <Check size={15} weight="bold" aria-hidden="true" />}
                </span>
                <Icon size={24} weight="light" className="text-ink" aria-hidden="true" />
                <span className="mt-5 block text-lg text-ink">{name}</span>
                <span className="mt-1 block min-h-10 text-sm leading-5 text-ink-dim">{description}</span>
                <span className="mt-5 flex gap-1.5" aria-label={`${name} colors`}>
                  {swatches.map(color => (
                    <i
                      key={color}
                      className="h-5 w-5 border border-line"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <div role="alert" className="border border-signal-error/30 bg-signal-error/10 px-4 py-3 text-sm text-signal-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="border border-signal-ok/30 bg-signal-ok/10 px-4 py-3 text-sm text-signal-ok">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={saving || theme === savedTheme} className="btn btn-primary">
          {saving ? 'Applying…' : 'Apply theme'}
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
          Preview shop
        </a>
        <p className="text-xs text-ink-dim sm:ml-2">Changes apply to the whole storefront.</p>
      </div>
    </form>
  )
}
