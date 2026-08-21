import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

const ThemeSettingsForm = (await import('@/components/admin/ThemeSettingsForm')).default

describe('ThemeSettingsForm', () => {
  it('previews the selected theme without publishing it', async () => {
    const user = userEvent.setup()
    render(<ThemeSettingsForm initialTheme="default" />)

    const preview = screen.getByRole('link', { name: /preview shop/i })
    expect(preview).toHaveAttribute('href', '/?preview_theme=default')

    await user.click(screen.getByRole('radio', { name: /christmas/i }))

    expect(preview).toHaveAttribute('href', '/?preview_theme=christmas')
    expect(screen.getByRole('button', { name: /apply theme/i })).toBeEnabled()
  })
})
