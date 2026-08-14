'use client'

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { SiteTheme } from '@/types'

const SNOW = [
  ['4%', '7px', '0s', '10s', '18px'],
  ['13%', '5px', '-5s', '13s', '-24px'],
  ['23%', '8px', '-2s', '12s', '30px'],
  ['34%', '4px', '-8s', '14s', '-18px'],
  ['45%', '7px', '-3s', '11s', '22px'],
  ['55%', '5px', '-9s', '15s', '-26px'],
  ['65%', '9px', '-4s', '13s', '20px'],
  ['74%', '5px', '-7s', '11s', '-16px'],
  ['83%', '7px', '-1s', '14s', '28px'],
  ['92%', '4px', '-6s', '12s', '-20px'],
] as const

type SnowStyle = CSSProperties & {
  '--snow-left': string
  '--snow-size': string
  '--snow-delay': string
  '--snow-duration': string
  '--snow-drift': string
}

function SeasonalDecor({ theme }: { theme: SiteTheme }) {
  if (theme === 'christmas') {
    return (
      <div className="seasonal-snow" aria-hidden="true">
        {SNOW.map(([left, size, delay, duration, drift], index) => (
          <i
            key={index}
            className="seasonal-snowflake"
            style={{
              '--snow-left': left,
              '--snow-size': size,
              '--snow-delay': delay,
              '--snow-duration': duration,
              '--snow-drift': drift,
            } as SnowStyle}
          />
        ))}
      </div>
    )
  }

  if (theme === 'ramadan') {
    return (
      <div className="seasonal-ramadan-ornament" aria-hidden="true">
        <svg viewBox="0 0 72 96" role="presentation">
          <path d="M48 12c-17 4-27 22-20 38 6 14 22 21 36 15-9 11-25 15-38 8C7 64 2 40 13 23 21 10 35 4 48 5v7Z" />
          <path d="m55 24 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9L55 24Z" />
          <path d="M18 77h38M23 84h28M29 91h16" />
        </svg>
      </div>
    )
  }

  return null
}

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
      <SeasonalDecor theme={activeTheme} />
      {children}
    </div>
  )
}
