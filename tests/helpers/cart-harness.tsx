import * as React from 'react'
import { screen } from '@testing-library/react'
import { CartProvider, useCart } from '@/lib/cart-context'
import type { Product } from '@/types'

export interface CartLine {
  id: string
  size: string | null
  qty: number
  colorId?: string
  colorName?: string
  variantId?: string
}

/**
 * Renders the live cart state into data-attributes so tests can assert on what
 * actually landed in the cart, not just on what the UI happens to paint.
 */
export function CartProbe() {
  const { items, totalItems } = useCart()
  const lines: CartLine[] = items.map(i => ({
    id: i.product.id,
    size: i.selectedSize,
    qty: i.quantity,
    ...(i.selectedColor
      ? { colorId: i.selectedColor.id, colorName: i.selectedColor.name }
      : {}),
    ...(i.selectedVariantId ? { variantId: i.selectedVariantId } : {}),
  }))
  return (
    <div
      data-testid="cart-probe"
      data-total={String(totalItems)}
      data-lines={JSON.stringify(lines)}
    />
  )
}

export function readCart(): { total: number; lines: CartLine[] } {
  const el = screen.getByTestId('cart-probe')
  return {
    total: Number(el.getAttribute('data-total')),
    lines: JSON.parse(el.getAttribute('data-lines') ?? '[]') as CartLine[],
  }
}

/** Buttons that drive the cart from outside the component under test. */
export function CartControls({ products }: { products: Product[] }) {
  const { addToCart, openCart } = useCart()
  return (
    <div>
      {products.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            const selectedColor = p.colors?.[0] ?? null
            const selectedVariant = p.variants?.find(
              variant => variant.color_id === selectedColor?.id && variant.in_stock,
            ) ?? null
            addToCart(p, selectedVariant?.size ?? p.sizes?.[0] ?? null, {
              selectedColor,
              selectedVariantId: selectedVariant?.id ?? null,
            })
          }}
          data-testid={`seed-${p.id}`}
        >
          {`seed ${p.id}`}
        </button>
      ))}
      <button type="button" onClick={openCart} data-testid="open-cart">
        open cart
      </button>
    </div>
  )
}

export function withCart(ui: React.ReactNode) {
  return (
    <CartProvider>
      {ui}
      <CartProbe />
    </CartProvider>
  )
}
