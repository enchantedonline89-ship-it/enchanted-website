import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SiteThemeShell from '@/components/public/SiteThemeShell'

const navigation = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}))

describe('SiteThemeShell', () => {
  beforeEach(() => {
    navigation.pathname = '/'
    window.history.replaceState(null, '', '/')
  })

  it('renders the integrated Christmas decoration only for the Christmas theme', () => {
    const { container } = render(
      <SiteThemeShell theme="christmas">
        <main>Storefront</main>
      </SiteThemeShell>,
    )

    const shell = container.querySelector('.site-theme-root')
    const backdrop = container.querySelector('.seasonal-backdrop--christmas')

    expect(shell?.getAttribute('data-site-theme')).toBe('christmas')
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.seasonal-snowflake')).toHaveLength(14)
    expect(container.querySelector('.seasonal-christmas-garland')).not.toBeNull()
    expect(screen.getByText('Storefront')).not.toBeNull()
  })

  it('renders Ramadan lanterns, stars, and a crescent without exposing decoration to assistive tech', () => {
    const { container } = render(
      <SiteThemeShell theme="ramadan">
        <main>Storefront</main>
      </SiteThemeShell>,
    )

    const shell = container.querySelector('.site-theme-root')
    const backdrop = container.querySelector('.seasonal-backdrop--ramadan')

    expect(shell?.getAttribute('data-site-theme')).toBe('ramadan')
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.seasonal-ramadan-lantern')).toHaveLength(3)
    expect(container.querySelectorAll('.seasonal-ramadan-star')).toHaveLength(9)
    expect(container.querySelector('.seasonal-ramadan-crescent')).not.toBeNull()
  })

  it('keeps admin routes neutral even when a seasonal storefront theme is active', () => {
    navigation.pathname = '/admin/dashboard'

    const { container } = render(
      <SiteThemeShell theme="christmas">
        <main>Admin</main>
      </SiteThemeShell>,
    )

    expect(container.querySelector('.site-theme-root')?.getAttribute('data-site-theme')).toBe('default')
    expect(container.querySelector('.seasonal-backdrop')).toBeNull()
  })

  it('supports a non-persistent Ramadan preview from the storefront query string', () => {
    window.history.replaceState(null, '', '/?preview_theme=ramadan')

    const { container } = render(
      <SiteThemeShell theme="default">
        <main>Preview</main>
      </SiteThemeShell>,
    )

    expect(container.querySelector('.site-theme-root')?.getAttribute('data-site-theme')).toBe('ramadan')
    expect(container.querySelector('.seasonal-backdrop--ramadan')).not.toBeNull()
  })
})
