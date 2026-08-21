import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }))

const ThemeSettingsForm = (await import('@/components/admin/ThemeSettingsForm')).default

describe('ThemeSettingsForm', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    h.refresh.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('previews the selected theme without publishing it', async () => {
    const user = userEvent.setup()
    render(<ThemeSettingsForm initialTheme="default" />)

    const preview = screen.getByRole('link', { name: /preview shop/i })
    expect(preview).toHaveAttribute('href', '/?preview_theme=default')

    await user.click(screen.getByRole('radio', { name: /christmas/i }))

    expect(preview).toHaveAttribute('href', '/?preview_theme=christmas')
    expect(screen.getByRole('button', { name: /apply theme/i })).toBeEnabled()
  })

  it('publishes through the authorized theme endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'ramadan' }),
    })
    const user = userEvent.setup()
    render(<ThemeSettingsForm initialTheme="default" />)

    await user.click(screen.getByRole('radio', { name: /ramadan/i }))
    await user.click(screen.getByRole('button', { name: /apply theme/i }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/settings/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'ramadan' }),
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Ramadan is now live.')
    expect(h.refresh).toHaveBeenCalledTimes(1)
  })
})
