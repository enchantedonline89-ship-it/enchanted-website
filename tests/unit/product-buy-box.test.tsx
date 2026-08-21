import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ProductBuyBox from '@/components/public/ProductBuyBox'
import { makeColorProduct } from '../helpers/factories'
import { readCart, withCart } from '../helpers/cart-harness'

describe('ProductBuyBox — color inventory', () => {
  it('filters sizes by the chosen color and stores its exact variant', async () => {
    const user = userEvent.setup()
    render(withCart(
      <ProductBuyBox product={makeColorProduct()} sizeSystem="eu_footwear" />,
    ))

    await user.click(screen.getByRole('button', { name: /select midnight blue/i }))

    expect(screen.getByRole('button', { name: '38' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '36' })).toBeNull()

    await user.click(screen.getByRole('button', { name: '38' }))
    await user.click(screen.getByRole('button', { name: /^add to cart$/i }))

    expect(readCart().lines).toEqual([{
      id: 'p-color',
      size: '38',
      qty: 1,
      colorId: 'color-blue',
      colorName: 'Midnight Blue',
      variantId: 'variant-blue-38',
    }])
  })

  it('does not allow a sold-out color/size selection to be added', async () => {
    const user = userEvent.setup()
    render(withCart(
      <ProductBuyBox product={makeColorProduct()} sizeSystem="eu_footwear" />,
    ))

    await user.click(screen.getByRole('button', { name: /select ruby red/i }))

    expect(screen.getByRole('button', { name: /37, out of stock/i })).toBeDisabled()
    expect(readCart().lines).toEqual([])
  })
})
