import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }))

const PromotionManager = (
  await import('@/app/admin/(protected)/promotions/PromotionManager')
).default

describe('PromotionManager', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    h.refresh.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('saves through the authorized admin API and refreshes the D1-backed list', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ promotion: { id: 'promotion-id' } }),
    })

    const user = userEvent.setup()
    render(<PromotionManager initialPromotions={[]} categories={[]} />)

    await user.type(screen.getByLabelText(/campaign name/i), 'Holiday announcement')
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/promotions', expect.objectContaining({
      method: 'POST',
    }))
    expect(h.refresh).toHaveBeenCalledTimes(1)
  })
})
