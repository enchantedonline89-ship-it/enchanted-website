import * as React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { CartProvider, cartItemKey, useCart, type CartItem } from '@/lib/cart-context'
import { makeAccessory, makeColorProduct, makeSizedProduct } from '../helpers/factories'

const STORAGE_KEY = 'enchanted-cart'

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

/** Render the cart hook and wait for the localStorage hydration effect to settle. */
async function renderCart() {
  const view = renderHook(() => useCart(), { wrapper })
  await waitFor(() => expect(view.result.current).toBeTruthy())
  return view
}

function storedItems(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CartItem[]) : []
}

function makeSharedSizeColorProduct() {
  const product = makeColorProduct()
  const blue = product.variants!.find(variant => variant.color_id === 'color-blue')!
  return {
    ...product,
    variants: [
      ...product.variants!,
      { ...blue, id: 'variant-blue-36', sku: 'BLUE-36', size: '36' },
    ],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Line-item key ────────────────────────────────────────────────────────────

describe('cartItemKey', () => {
  it('joins product id and size with the "::" separator', () => {
    expect(cartItemKey('p-1', '38')).toBe('p-1::38')
  })

  it('uses the "no-size" sentinel when no size is selected', () => {
    expect(cartItemKey('p-1', null)).toBe('p-1::no-size')
  })

  it('keys the same product under different sizes separately', () => {
    expect(cartItemKey('p-1', '37')).not.toBe(cartItemKey('p-1', '38'))
  })

  it('keys different products under the same size separately', () => {
    expect(cartItemKey('p-1', '38')).not.toBe(cartItemKey('p-2', '38'))
  })

  it('adds the color only when present, preserving legacy keys', () => {
    expect(cartItemKey('p-1', '38')).toBe('p-1::38')
    expect(cartItemKey('p-1', '38', 'color-red')).toBe(
      'p-1::38::color:color-red',
    )
  })

  it('DOCUMENTS a sentinel collision: a literal "no-size" size collides with null', () => {
    // Not currently reachable — no product in the catalogue has a size literally
    // named "no-size" — but the sentinel is not escaped, so it is a latent trap.
    expect(cartItemKey('p-1', 'no-size')).toBe(cartItemKey('p-1', null))
  })
})

// ─── Adding ───────────────────────────────────────────────────────────────────

describe('CartProvider — addToCart', () => {
  it('adds a new product as a single line with quantity 1', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({ selectedSize: '38', quantity: 1 })
    expect(result.current.items[0].product.id).toBe(product.id)
    expect(result.current.totalItems).toBe(1)
  })

  it('increments quantity instead of duplicating when the same product+size is re-added', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.addToCart(product, '38'))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(3)
    expect(result.current.totalItems).toBe(3)
  })

  it('keeps the same product in separate lines when the sizes differ', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '37'))
    act(() => result.current.addToCart(product, '38'))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items.map(i => i.selectedSize)).toEqual(['37', '38'])
    expect(result.current.totalItems).toBe(2)
  })

  it('keeps different products in separate lines when the size matches', async () => {
    const a = makeSizedProduct({ id: 'p-a' })
    const b = makeSizedProduct({ id: 'p-b' })
    const { result } = await renderCart()

    act(() => result.current.addToCart(a, '38'))
    act(() => result.current.addToCart(b, '38'))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.totalItems).toBe(2)
  })

  it('treats a null size (accessory) as its own line and increments it', async () => {
    const accessory = makeAccessory()
    const { result } = await renderCart()

    act(() => result.current.addToCart(accessory, null))
    act(() => result.current.addToCart(accessory, null))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].selectedSize).toBeNull()
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('appends new lines after existing ones (stable ordering)', async () => {
    const a = makeSizedProduct({ id: 'p-a', name: 'First' })
    const b = makeSizedProduct({ id: 'p-b', name: 'Second' })
    const { result } = await renderCart()

    act(() => result.current.addToCart(a, '36'))
    act(() => result.current.addToCart(b, '36'))
    act(() => result.current.addToCart(a, '36'))

    expect(result.current.items.map(i => i.product.name)).toEqual(['First', 'Second'])
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('merges only the exact same product, size, and color selection', async () => {
    const product = makeSharedSizeColorProduct()
    const red = product.colors![0]
    const blue = product.colors![1]
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '36', {
      selectedColor: red,
      selectedVariantId: 'variant-red-36',
    }))
    act(() => result.current.addToCart(product, '36', {
      selectedColor: blue,
      selectedVariantId: 'variant-blue-36',
    }))
    act(() => result.current.addToCart(product, '36', {
      selectedColor: red,
      selectedVariantId: 'variant-red-36',
    }))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items.find(item => item.selectedColor?.id === red.id)?.quantity).toBe(2)
    expect(result.current.items.find(item => item.selectedColor?.id === blue.id)?.quantity).toBe(1)
  })

  it('rejects an out-of-stock variant even when called outside the picker UI', async () => {
    const product = makeColorProduct()
    const red = product.colors![0]
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '37', {
      selectedColor: red,
      selectedVariantId: 'variant-red-37',
    }))

    expect(result.current.items).toEqual([])
  })
})

// ─── Quantity ─────────────────────────────────────────────────────────────────

describe('CartProvider — updateQuantity', () => {
  it('sets an exact quantity on the matching line only', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '37'))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.updateQuantity(product.id, '38', 5))

    expect(result.current.items.find(i => i.selectedSize === '38')!.quantity).toBe(5)
    expect(result.current.items.find(i => i.selectedSize === '37')!.quantity).toBe(1)
    expect(result.current.totalItems).toBe(6)
  })

  it('removes the line when quantity drops to 0', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.updateQuantity(product.id, '38', 0))

    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalItems).toBe(0)
  })

  it('removes the line for a negative quantity rather than storing it', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.updateQuantity(product.id, '38', -3))

    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalItems).toBe(0)
  })

  it('is a no-op for a product+size that is not in the cart', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.updateQuantity(product.id, '36', 9))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(1)
  })

  it('does not touch the null-size line when updating a sized line of the same product', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, null))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.updateQuantity(product.id, '38', 4))

    expect(result.current.items.find(i => i.selectedSize === null)!.quantity).toBe(1)
    expect(result.current.items.find(i => i.selectedSize === '38')!.quantity).toBe(4)
  })

  it('updates only the requested color when product and size match', async () => {
    const product = makeSharedSizeColorProduct()
    const red = product.colors![0]
    const blue = product.colors![1]
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '36', {
      selectedColor: red,
      selectedVariantId: 'variant-red-36',
    }))
    act(() => result.current.addToCart(product, '36', {
      selectedColor: blue,
      selectedVariantId: 'variant-blue-36',
    }))
    act(() => result.current.updateQuantity(product.id, '36', 4, red.id))

    expect(result.current.items.find(item => item.selectedColor?.id === red.id)?.quantity).toBe(4)
    expect(result.current.items.find(item => item.selectedColor?.id === blue.id)?.quantity).toBe(1)
  })
})

// ─── Removal ──────────────────────────────────────────────────────────────────

describe('CartProvider — removeFromCart / clearCart', () => {
  it('removes only the line matching product id AND size', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '37'))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.removeFromCart(product.id, '37'))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].selectedSize).toBe('38')
  })

  it('removes a null-size line without touching sized lines', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, null))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.removeFromCart(product.id, null))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].selectedSize).toBe('38')
  })

  it('removes only the requested color when product and size match', async () => {
    const product = makeSharedSizeColorProduct()
    const red = product.colors![0]
    const blue = product.colors![1]
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '36', {
      selectedColor: red,
      selectedVariantId: 'variant-red-36',
    }))
    act(() => result.current.addToCart(product, '36', {
      selectedColor: blue,
      selectedVariantId: 'variant-blue-36',
    }))
    act(() => result.current.removeFromCart(product.id, '36', red.id))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].selectedColor?.id).toBe(blue.id)
  })

  it('clearCart empties every line', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '37'))
    act(() => result.current.addToCart(product, '38'))
    act(() => result.current.clearCart())

    expect(result.current.items).toHaveLength(0)
    expect(result.current.totalItems).toBe(0)
  })
})

// ─── totalItems ───────────────────────────────────────────────────────────────

describe('CartProvider — totalItems', () => {
  it('sums quantities across lines, not line count', async () => {
    const a = makeSizedProduct({ id: 'p-a' })
    const b = makeSizedProduct({ id: 'p-b' })
    const { result } = await renderCart()

    act(() => result.current.addToCart(a, '38'))
    act(() => result.current.updateQuantity(a.id, '38', 7))
    act(() => result.current.addToCart(b, '36'))
    act(() => result.current.updateQuantity(b.id, '36', 2))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.totalItems).toBe(9)
  })

  it('is 0 for an empty cart', async () => {
    const { result } = await renderCart()
    expect(result.current.totalItems).toBe(0)
  })
})

// ─── Drawer open state ────────────────────────────────────────────────────────

describe('CartProvider — drawer open state', () => {
  it('starts closed and toggles via openCart / closeCart', async () => {
    const { result } = await renderCart()

    expect(result.current.isOpen).toBe(false)
    act(() => result.current.openCart())
    expect(result.current.isOpen).toBe(true)
    act(() => result.current.closeCart())
    expect(result.current.isOpen).toBe(false)
  })
})

// ─── localStorage persistence ─────────────────────────────────────────────────

describe('CartProvider — localStorage persistence', () => {
  it('persists added items under the "enchanted-cart" key', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '38'))

    await waitFor(() => expect(storedItems()).toHaveLength(1))
    expect(storedItems()[0]).toMatchObject({ selectedSize: '38', quantity: 1 })
  })

  it('persists color and variant identifiers without breaking legacy carts', async () => {
    const product = makeColorProduct()
    const red = product.colors![0]
    const { result } = await renderCart()

    act(() => result.current.addToCart(product, '36', {
      selectedColor: red,
      selectedVariantId: 'variant-red-36',
    }))

    await waitFor(() => expect(storedItems()).toHaveLength(1))
    expect(storedItems()[0]).toMatchObject({
      selectedColor: { id: 'color-red', name: 'Ruby Red' },
      selectedVariantId: 'variant-red-36',
    })
  })

  it('persists removals, so a cleared cart does not resurrect on reload', async () => {
    const product = makeSizedProduct()
    const first = await renderCart()

    act(() => first.result.current.addToCart(product, '38'))
    await waitFor(() => expect(storedItems()).toHaveLength(1))
    act(() => first.result.current.clearCart())
    await waitFor(() => expect(storedItems()).toHaveLength(0))

    first.unmount()
    const second = await renderCart()
    await waitFor(() => expect(second.result.current.items).toHaveLength(0))
  })

  it('rehydrates a previously stored cart on mount', async () => {
    const product = makeSizedProduct()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ product, selectedSize: '38', quantity: 4 }]),
    )

    const { result } = await renderCart()

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].quantity).toBe(4)
    expect(result.current.totalItems).toBe(4)
  })

  it('does not wipe stored items with the pre-hydration empty state', async () => {
    const product = makeSizedProduct()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ product, selectedSize: '38', quantity: 2 }]),
    )

    const { result } = await renderCart()
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    expect(storedItems()).toHaveLength(1)
    expect(storedItems()[0].quantity).toBe(2)
  })

  it('falls back to an empty cart when stored JSON is corrupt', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')

    const { result } = await renderCart()

    await waitFor(() => expect(result.current.items).toEqual([]))
    expect(result.current.totalItems).toBe(0)
  })

  it('falls back to an empty cart when localStorage.getItem throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })

    const { result } = await renderCart()

    await waitFor(() => expect(result.current.items).toEqual([]))
  })

  it('keeps working in memory when localStorage.setItem throws (quota exceeded)', async () => {
    const product = makeSizedProduct()
    const { result } = await renderCart()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    expect(() => act(() => result.current.addToCart(product, '38'))).not.toThrow()
    expect(result.current.items).toHaveLength(1)
    expect(result.current.totalItems).toBe(1)
  })
})

// ─── Guard ────────────────────────────────────────────────────────────────────

describe('useCart', () => {
  it('throws a clear error when used outside CartProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useCart())).toThrow(/must be used inside CartProvider/)
    spy.mockRestore()
  })
})
