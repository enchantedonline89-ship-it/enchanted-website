'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { SiteTheme } from '@/types'
import SeasonalBackdrop from '@/components/public/SeasonalBackdrop'

const PREVIEWABLE: readonly SiteTheme[] = ['default', 'christmas', 'ramadan']

export default function SiteThemeShell({
  theme,
  children,
}: {
  theme: SiteTheme
  children: ReactNode
}) {
  const pathname = usePathname()

  /**
   * `?preview_theme=christmas` renders a season without publishing it, so the
   * owner can see exactly what customers would get before switching it on for
   * everyone. Read from location rather than useSearchParams, which would opt
   * this whole subtree, meaning the entire site, into client rendering.
   *
   * Purely cosmetic and deliberately unauthenticated: it changes decoration and
   * a background tint, nothing else. It is never persisted.
   */
  const [preview, setPreview] = useState<{ path: string | null; theme: SiteTheme | null }>({
    path: null,
    theme: null,
  })

  // Adjusted during render rather than in an effect. Setting it in an effect
  // would paint the unthemed page first and then repaint with the season, which
  // is a visible flash. The window guard keeps the server render, which has no
  // location, identical to the first client render.
  if (typeof window !== 'undefined' && preview.path !== pathname) {
    const value = new URLSearchParams(window.location.search).get('preview_theme')
    setPreview({
      path: pathname,
      theme:
        value && (PREVIEWABLE as readonly string[]).includes(value)
          ? (value as SiteTheme)
          : null,
    })
  }

  const activeTheme = pathname.startsWith('/admin') ? 'default' : (preview.theme ?? theme)

  return (
    <div className="site-theme-root" data-site-theme={activeTheme}>
      <SeasonalBackdrop theme={activeTheme} />
      {children}
    </div>
  )
}
