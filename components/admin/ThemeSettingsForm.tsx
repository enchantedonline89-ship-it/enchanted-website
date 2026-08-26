'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MoonStars, Snowflake, Sparkle } from '@phosphor-icons/react/ssr'
import type { SiteTheme, ThemeIntensity, ThemeSchedule } from '@/types'

const THEMES = [
  { id: 'default', name: 'Enchanted', description: 'Classic white, ink and gold.', Icon: Sparkle, swatches: ['#ffffff', '#14120e', '#f0c068'] },
  { id: 'christmas', name: 'Christmas', description: 'Evergreen, berry, a logo hat and snowfall.', Icon: Snowflake, swatches: ['#fffaf5', '#8b2430', '#234c35'] },
  { id: 'ramadan', name: 'Ramadan', description: 'Moonlit navy, warm gold, stars and lanterns.', Icon: MoonStars, swatches: ['#fffaf0', '#182642', '#c99332'] },
] satisfies Array<{
  id: SiteTheme
  name: string
  description: string
  Icon: typeof Sparkle
  swatches: string[]
}>

function localDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

type DraftSchedule = {
  theme: 'christmas' | 'ramadan'
  startsAt: string
  endsAt: string
  intensity: ThemeIntensity
  campaignCopy: string
  enabled: boolean
}

function draft(schedule: ThemeSchedule): DraftSchedule {
  return {
    theme: schedule.theme,
    startsAt: localDateTime(schedule.starts_at),
    endsAt: localDateTime(schedule.ends_at),
    intensity: schedule.animation_intensity,
    campaignCopy: schedule.campaign_copy,
    enabled: schedule.is_enabled,
  }
}

export default function ThemeSettingsForm({
  initialTheme,
  initialSchedules = [
    { theme: 'christmas', starts_at: null, ends_at: null, animation_intensity: 'medium', campaign_copy: 'A little Christmas magic, styled for the season.', is_enabled: false },
    { theme: 'ramadan', starts_at: null, ends_at: null, animation_intensity: 'medium', campaign_copy: 'Ramadan evenings, dressed in gold.', is_enabled: false },
  ],
}: {
  initialTheme: SiteTheme
  initialSchedules?: ThemeSchedule[]
}) {
  const router = useRouter()
  const [theme, setTheme] = useState<SiteTheme>(initialTheme)
  const [schedules, setSchedules] = useState(() => initialSchedules.map(draft))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function updateSchedule(themeId: DraftSchedule['theme'], patch: Partial<DraftSchedule>) {
    setSchedules(current => current.map(item => item.theme === themeId ? { ...item, ...patch } : item))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/settings/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          schedules: schedules.map(item => ({
            theme: item.theme,
            starts_at: item.startsAt ? new Date(item.startsAt).toISOString() : null,
            ends_at: item.endsAt ? new Date(item.endsAt).toISOString() : null,
            animation_intensity: item.intensity,
            campaign_copy: item.campaignCopy,
            is_enabled: item.enabled,
          })),
        }),
      })
      const value: unknown = await response.json().catch(() => ({}))
      const result = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Could not save appearance.')
      }
      setMessage(`${THEMES.find(item => item.id === theme)?.name ?? 'Theme'} is now live; holiday schedules are saved.`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save appearance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        <legend className="text-sm font-medium text-ink">Manual storefront theme</legend>
        <p className="mt-1 text-sm text-ink-dim">
          An active scheduled holiday overrides this choice until its end date.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {THEMES.map(({ id, name, description, Icon, swatches }) => {
            const selected = theme === id
            return (
              <label key={id} className={`relative cursor-pointer border p-5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${selected ? 'border-ink bg-paper-sunken' : 'border-line bg-paper-raised hover:border-line-strong'}`}>
                <input type="radio" name="site-theme" value={id} checked={selected} onChange={() => setTheme(id)} className="peer sr-only" />
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center border border-line-strong">
                  {selected && <Check size={15} weight="bold" aria-hidden="true" />}
                </span>
                <Icon size={24} weight="light" className="text-ink" aria-hidden="true" />
                <span className="mt-5 block text-lg text-ink">{name}</span>
                <span className="mt-1 block min-h-10 text-sm leading-5 text-ink-dim">{description}</span>
                <span className="mt-5 flex gap-1.5" aria-label={`${name} colors`}>
                  {swatches.map(color => <i key={color} className="h-5 w-5 border border-line" style={{ backgroundColor: color }} />)}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="border-t border-line pt-8">
        <legend className="text-sm font-medium text-ink">Holiday schedules</legend>
        <p className="mt-1 text-sm text-ink-dim">Times are entered in your device’s timezone and stored safely as UTC.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {schedules.map(item => {
            const label = item.theme === 'christmas' ? 'Christmas' : 'Ramadan'
            return (
              <section key={item.theme} className="border border-line bg-paper p-4 sm:p-5" aria-labelledby={`${item.theme}-schedule`}>
                <div className="flex items-center justify-between gap-4">
                  <h2 id={`${item.theme}-schedule`} className="text-lg text-ink">{label}</h2>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={item.enabled} onChange={event => updateSchedule(item.theme, { enabled: event.target.checked })} className="h-4 w-4 accent-ink" />
                    Scheduled
                  </label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-ink">Starts
                    <input type="datetime-local" value={item.startsAt} onChange={event => updateSchedule(item.theme, { startsAt: event.target.value })} className="field mt-1.5" required={item.enabled} />
                  </label>
                  <label className="text-sm text-ink">Ends
                    <input type="datetime-local" value={item.endsAt} onChange={event => updateSchedule(item.theme, { endsAt: event.target.value })} className="field mt-1.5" required={item.enabled} />
                  </label>
                </div>
                <label className="mt-4 block text-sm text-ink">Animation intensity
                  <select value={item.intensity} onChange={event => updateSchedule(item.theme, { intensity: event.target.value as ThemeIntensity })} className="field mt-1.5">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="mt-4 block text-sm text-ink">Site-wide campaign line
                  <input value={item.campaignCopy} onChange={event => updateSchedule(item.theme, { campaignCopy: event.target.value.slice(0, 120) })} maxLength={120} className="field mt-1.5" placeholder={`${label} storefront message`} />
                </label>
                <a href={`/?preview_theme=${item.theme}&preview_intensity=${item.intensity}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-4 w-full">Preview {label}</a>
              </section>
            )
          })}
        </div>
      </fieldset>

      {error && <div role="alert" className="border border-signal-error/30 bg-signal-error/10 px-4 py-3 text-sm text-signal-error">{error}</div>}
      {message && <div role="status" className="border border-signal-ok/30 bg-signal-ok/10 px-4 py-3 text-sm text-signal-ok">{message}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Applying…' : 'Apply theme and schedules'}</button>
        <a href={`/?preview_theme=${theme}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Preview shop</a>
        <p className="text-xs text-ink-dim">Changes apply storefront-wide; admin screens remain neutral.</p>
      </div>
    </form>
  )
}
