import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ProductBuyBox from '@/components/public/ProductBuyBox'
import ProductGallery from '@/components/public/ProductGallery'
import { ProductSelectionProvider } from '@/components/public/ProductSelectionProvider'
import { makeColorProduct } from '../helpers/factories'
import { withCart } from '../helpers/cart-harness'

describe('product color imagery', () => {
  it('moves the chosen color photo to the front of the product gallery', async () => {
    const user = userEvent.setup()
    const base = makeColorProduct()
    const product = makeColorProduct({
      colors: base.colors?.map((color) => ({ ...color, image_url: `https://example.test/${color.id}.jpg` })),
    })
    render(withCart(
      <ProductSelectionProvider productId={product.id}>
        <ProductGallery product={product} />
        <ProductBuyBox product={product} sizeSystem="eu_footwear" />
      </ProductSelectionProvider>,
    ))

    await user.click(screen.getByRole('button', { name: /select midnight blue/i }))

    await waitFor(() => {
      for (const image of screen.getAllByRole('img', { name: /view 1 of/i })) {
        expect(image).toHaveAttribute('src', 'https://example.test/color-blue.jpg')
      }
    })
  })
})
