'use client'

import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { SiteTheme, SiteThemeConfig, ThemeIntensity } from '@/types'
import SeasonalBackdrop from '@/components/public/SeasonalBackdrop'

const PREVIEWABLE: readonly SiteTheme[] = ['default', 'christmas', 'ramadan']

function subscribeToLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export default function SiteThemeShell({
  config,
  theme,
  children,
}: {
  config?: SiteThemeConfig
  theme?: SiteTheme
  children: ReactNode
}) {
  const pathname = usePathname()
  const resolved = config ?? { theme: theme ?? 'default', intensity: 'medium', campaignCopy: '' }

  /**
   * `?preview_theme=christmas` renders a season without publishing it, so the
   * owner can see exactly what customers would get before switching it on for
   * everyone. Read from location rather than useSearchParams, which would opt
   * this whole subtree, meaning the entire site, into client rendering.
   *
   * Purely cosmetic and deliberately unauthenticated: it changes decoration and
   * a background tint, nothing else. It is never persisted.
   */
  // The empty server snapshot preserves hydration; React reads the real query
  // immediately after mounting without an effect-driven state update.
  const search = useSyncExternalStore(
    subscribeToLocation,
    () => window.location.search,
    () => '',
  )
  const parameters = new URLSearchParams(search)
  const value = parameters.get('preview_theme')
  const intensityValue = parameters.get('preview_intensity')
  const preview: { theme: SiteTheme | null; intensity: ThemeIntensity | null } = {
    theme: value && (PREVIEWABLE as readonly string[]).includes(value)
      ? value as SiteTheme
      : null,
    intensity: intensityValue === 'low' || intensityValue === 'high' || intensityValue === 'medium'
      ? intensityValue
      : null,
  }

  const isAdmin = pathname.startsWith('/admin')
  const activeTheme = isAdmin ? 'default' : (preview.theme ?? resolved.theme)
  const campaignCopy = !isAdmin && activeTheme !== 'default'
    ? (preview.theme && preview.theme !== resolved.theme ? '' : resolved.campaignCopy)
    : ''
  const activeIntensity = preview.theme ? (preview.intensity ?? resolved.intensity) : resolved.intensity

  return (
    <div
      className="site-theme-root"
      data-site-theme={activeTheme}
      data-theme-intensity={activeIntensity}
      data-theme-campaign={campaignCopy ? 'visible' : 'hidden'}
    >
      <SeasonalBackdrop theme={activeTheme} intensity={activeIntensity} />
      {campaignCopy && (
        <aside className="seasonal-campaign-banner" aria-label="Seasonal announcement">
          {campaignCopy}
        </aside>
      )}
      <div className="site-theme-content">{children}</div>
    </div>
  )
}
