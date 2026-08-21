import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const PromotionManager = (
  await import('@/app/admin/(protected)/promotions/PromotionManager')
).default

describe('PromotionManager', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  it('shows a non-blocking audit warning after a successful save', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        promotion: { id: 'promotion-id' },
        warning: 'The campaign was saved, but its audit entry could not be recorded.',
      }),
    })

    const user = userEvent.setup()
    render(<PromotionManager initialPromotions={[]} categories={[]} />)

    await user.type(screen.getByLabelText(/campaign name/i), 'Holiday announcement')
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The campaign was saved, but its audit entry could not be recorded.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
