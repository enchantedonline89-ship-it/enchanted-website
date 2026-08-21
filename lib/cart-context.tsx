'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Product, ProductColor } from '@/types'

export type SelectedProductColor = Pick<
  ProductColor,
  'id' | 'name' | 'hex_code' | 'image_url'
>

export interface CartSelection {
  selectedColor?: SelectedProductColor | null
  selectedVariantId?: string | null
}

export interface CartItem {
  product: Product
  selectedSize: string | null
  /** Optional so carts saved before color support remain readable. */
  selectedColor?: SelectedProductColor | null
  selectedVariantId?: string | null
  quantity: number
}

// Stable key for a cart line item
export function cartItemKey(
  productId: string,
  selectedSize: string | null,
  selectedColorId: string | null = null,
): string {
  const base = `${productId}::${selectedSize ?? 'no-size'}`
  return selectedColorId ? `${base}::color:${selectedColorId}` : base
}

interface CartContextType {
  items: CartItem[]
  addToCart: (
    product: Product,
    selectedSize: string | null,
    selection?: CartSelection,
  ) => void
  removeFromCart: (
    productId: string,
    selectedSize: string | null,
    selectedColorId?: string | null,
  ) => void
  updateQuantity: (
    productId: string,
    selectedSize: string | null,
    quantity: number,
    selectedColorId?: string | null,
  ) => void
  clearCart: () => void
  totalItems: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'enchanted-cart'

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function selectionIsAvailable(
  product: Product,
  selectedSize: string | null,
  selection: CartSelection,
): boolean {
  const colors = product.colors ?? []
  const variants = product.variants ?? []
  const inventoryManaged = Boolean(
    product.inventory_tracked || colors.length > 0 || variants.length > 0,
  )
  if (!inventoryManaged) return true

  const selectedColor = selection.selectedColor ?? null
  if (colors.length > 0 && !selectedColor) return false

  const variant = variants.find(
    candidate => candidate.id === selection.selectedVariantId,
  )
  if (!variant || !variant.is_active || !variant.in_stock) return false
  if (variant.stock_quantity !== null && variant.stock_quantity <= 0) return false
  if (variant.color_id !== (selectedColor?.id ?? null)) return false
  return variant.size === selectedSize
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // The server has no localStorage, so the first client render must also be
  // empty. Reading storage during render changes the cart badge before React
  // can hydrate the server markup and causes a full-tree hydration recovery.
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const changedBeforeRestore = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!changedBeforeRestore.current) {
        setItems(loadFromStorage())
      }
      setHydrated(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // Persist whenever items change, but never before hydration, or the first
  // render would overwrite a real saved cart with an empty one.
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage full or unavailable, e.g. iOS private browsing. Silent by design.
    }
  }, [items, hydrated])

  const beginCartChange = useCallback(() => {
    changedBeforeRestore.current = true
    setHydrated(true)
  }, [])

  const addToCart = useCallback((
    product: Product,
    selectedSize: string | null,
    selection: CartSelection = {},
  ) => {
    if (!selectionIsAvailable(product, selectedSize, selection)) return
    beginCartChange()
    setItems(prev => {
      const selectedColor = selection.selectedColor ?? null
      const selectedVariantId = selection.selectedVariantId ?? null
      const key = cartItemKey(product.id, selectedSize, selectedColor?.id)
      const existing = prev.find(
        item => cartItemKey(
          item.product.id,
          item.selectedSize,
          item.selectedColor?.id,
        ) === key
      )
      if (existing) {
        return prev.map(item =>
          cartItemKey(item.product.id, item.selectedSize, item.selectedColor?.id) === key
            ? {
                ...item,
                product,
                selectedColor,
                selectedVariantId,
                quantity: item.quantity + 1,
              }
            : item
        )
      }
      return [
        ...prev,
        { product, selectedSize, selectedColor, selectedVariantId, quantity: 1 },
      ]
    })
  }, [beginCartChange])

  const removeFromCart = useCallback((
    productId: string,
    selectedSize: string | null,
    selectedColorId: string | null = null,
  ) => {
    beginCartChange()
    const key = cartItemKey(productId, selectedSize, selectedColorId)
    setItems(prev => prev.filter(
      item => cartItemKey(item.product.id, item.selectedSize, item.selectedColor?.id) !== key
    ))
  }, [beginCartChange])

  const updateQuantity = useCallback((
    productId: string,
    selectedSize: string | null,
    quantity: number,
    selectedColorId: string | null = null,
  ) => {
    beginCartChange()
    const key = cartItemKey(productId, selectedSize, selectedColorId)
    if (quantity <= 0) {
      setItems(prev => prev.filter(
        item => cartItemKey(item.product.id, item.selectedSize, item.selectedColor?.id) !== key
      ))
    } else {
      setItems(prev =>
        prev.map(item =>
          cartItemKey(item.product.id, item.selectedSize, item.selectedColor?.id) === key
            ? { ...item, quantity }
            : item
        )
      )
    }
  }, [beginCartChange])

  const clearCart = useCallback(() => {
    beginCartChange()
    setItems([])
  }, [beginCartChange])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, isOpen, openCart, closeCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
