import * as React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductCard from '@/components/public/ProductCard'
import { makeAccessory, makeSizedProduct } from '../helpers/factories'
import { readCart, withCart } from '../helpers/cart-harness'
import type { Product } from '@/types'

function renderCard(product: Product, extra: Partial<React.ComponentProps<typeof ProductCard>> = {}) {
  return render(withCart(<ProductCard product={product} {...extra} />))
}

const addButton = () => screen.getByRole('button', { name: /add to cart|added/i })

afterEach(() => {
  vi.useRealTimers()
})

// ─── Sized products must gate on size ─────────────────────────────────────────

describe('ProductCard — sized product size gating', () => {
  it('offers every size as a toggle button', () => {
    renderCard(makeSizedProduct({ sizes: ['36', '37', '38'] }))

    const group = screen.getByRole('group', { name: /choose a size/i })
    expect(group).toBeInTheDocument()
    for (const s of ['36', '37', '38']) {
      expect(screen.getByRole('button', { name: s })).toBeInTheDocument()
    }
  })

  it('blocks adding to cart when no size has been chosen', async () => {
    const user = userEvent.setup()
    renderCard(makeSizedProduct())

    await user.click(addButton())

    expect(screen.getByRole('alert')).toHaveTextContent(/pick a size first/i)
    expect(readCart().lines).toEqual([])
    expect(readCart().total).toBe(0)
  })

  it('does not show the size error before the customer tries to add', () => {
    renderCard(makeSizedProduct())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adds the selected size once one is chosen', async () => {
    const user = userEvent.setup()
    const product = makeSizedProduct({ id: 'p-sized', sizes: ['36', '37', '38'] })
    renderCard(product)

    await user.click(screen.getByRole('button', { name: '37' }))
    await user.click(addButton())

    expect(readCart().lines).toEqual([{ id: 'p-sized', size: '37', qty: 1 }])
  })

  it('clears the "pick a size" error as soon as a size is chosen', async () => {
    const user = userEvent.setup()
    renderCard(makeSizedProduct({ sizes: ['36', '37'] }))

    await user.click(addButton())
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '36' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('marks the chosen size with aria-pressed and moves it on reselection', async () => {
    const user = userEvent.setup()
    renderCard(makeSizedProduct({ sizes: ['36', '37'] }))

    await user.click(screen.getByRole('button', { name: '36' }))
    expect(screen.getByRole('button', { name: '36' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '37' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: '37' }))
    expect(screen.getByRole('button', { name: '36' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '37' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sends the last chosen size, not the first one clicked', async () => {
    const user = userEvent.setup()
    const product = makeSizedProduct({ id: 'p-last', sizes: ['36', '37', '38'] })
    renderCard(product)

    await user.click(screen.getByRole('button', { name: '36' }))
    await user.click(screen.getByRole('button', { name: '38' }))
    await user.click(addButton())

    expect(readCart().lines).toEqual([{ id: 'p-last', size: '38', qty: 1 }])
  })

  it('increments the same line when the same size is added twice', async () => {
    const user = userEvent.setup()
    const product = makeSizedProduct({ id: 'p-twice', sizes: ['38'] })
    renderCard(product)

    await user.click(screen.getByRole('button', { name: '38' }))
    await user.click(addButton())
    await user.click(addButton())

    expect(readCart().lines).toEqual([{ id: 'p-twice', size: '38', qty: 2 }])
    expect(readCart().total).toBe(2)
  })
})

// ─── Accessories (sizes: null) must NOT be gated ──────────────────────────────

describe('ProductCard — accessories with sizes: null', () => {
  it('renders no size chooser at all', () => {
    renderCard(makeAccessory())
    expect(screen.queryByRole('group', { name: /choose a size/i })).not.toBeInTheDocument()
  })

  it('adds straight to the cart with no size step', async () => {
    const user = userEvent.setup()
    const accessory = makeAccessory({ id: 'p-acc' })
    renderCard(accessory)

    await user.click(addButton())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(readCart().lines).toEqual([{ id: 'p-acc', size: null, qty: 1 }])
  })

  it('stores selectedSize as null, not the internal "one-size" placeholder', async () => {
    const user = userEvent.setup()
    renderCard(makeAccessory({ id: 'p-acc2' }))

    await user.click(addButton())

    expect(readCart().lines[0].size).toBeNull()
    expect(readCart().lines[0].size).not.toBe('one-size')
  })

  it('treats an empty sizes array like an accessory rather than gating forever', async () => {
    const user = userEvent.setup()
    renderCard(makeSizedProduct({ id: 'p-empty', sizes: [] }))

    await user.click(addButton())

    expect(screen.queryByRole('group', { name: /choose a size/i })).not.toBeInTheDocument()
    expect(readCart().lines).toEqual([{ id: 'p-empty', size: null, qty: 1 }])
  })
})

// ─── Presentation ─────────────────────────────────────────────────────────────

describe('ProductCard — presentation', () => {
  it('shows the product name as a heading and the price to two decimals', () => {
    renderCard(makeSizedProduct({ name: 'Velvet Gold-Strap Stiletto', price: 89.9 }))

    expect(screen.getByRole('heading', { name: 'Velvet Gold-Strap Stiletto' })).toBeInTheDocument()
    expect(screen.getByText('$89.90')).toBeInTheDocument()
  })

  it('shows "Ask" when a product has no price', () => {
    renderCard(makeSizedProduct({ price: null }))
    expect(screen.getByText('Ask')).toBeInTheDocument()
  })

  it('names the product on the image link and the title link', () => {
    renderCard(makeSizedProduct({ name: 'Satin Slip Midi Dress' }))
    // The photo is a link to the product page now, not a lightbox trigger, so
    // its accessible name comes from the image alt rather than an aria-label.
    expect(
      screen.getAllByRole("link", { name: /satin slip midi dress/i })[0],
    ).toBeInTheDocument()
  })

  it('links the photo and the name to the product page', () => {
    const product = makeSizedProduct({ name: 'Cutout Bodycon Maxi' })
    renderCard(product)

    const links = screen.getAllByRole('link')
    const href = `/product/cutout-bodycon-maxi-${product.id.replace(/-/g, '').slice(0, 6)}`
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) expect(link).toHaveAttribute('href', href)
  })

  it('drops the size row and the add button in linkOnly mode', () => {
    renderCard(makeSizedProduct({ name: 'Satin Slip Midi Dress' }), { linkOnly: true })
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull()
    expect(screen.queryByRole('group', { name: /choose a size/i })).toBeNull()
  })

  it('shows a fallback when the product has no photo', () => {
    renderCard(makeSizedProduct({ image_url: null, additional_images: null }))
    expect(screen.getByText(/no photo yet/i)).toBeInTheDocument()
  })

  it('badges the image count when there are extra photos', () => {
    renderCard(
      makeSizedProduct({
        image_url: 'https://example.test/a.jpg',
        additional_images: ['https://example.test/b.jpg', 'https://example.test/c.jpg'],
      }),
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('confirms with "Added" and reverts to "Add to cart" after the timeout', () => {
    // fireEvent, not userEvent: user-event's internal delay scheduling deadlocks
    // against Vitest fake timers, and this test is purely about the 1800ms revert.
    vi.useFakeTimers()
    renderCard(makeAccessory())

    fireEvent.click(addButton())
    expect(screen.getByRole('button', { name: /added/i })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1900)
    })
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })
})
