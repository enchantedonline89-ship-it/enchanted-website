# Complete Incomplete Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship 5 incomplete features: admin auth middleware, shopping cart with WhatsApp checkout, mobile menu, New Arrivals section, and product image lightbox.

**Architecture:** All features use existing dependencies (React state, Tailwind CSS, Next.js built-ins). No new npm packages. CartContext is extended with localStorage persistence and size selection. All new components match the dark obsidian/gold glamour theme.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase SSR, GSAP (existing)

---

## Task 1: Restore middleware.ts (Admin Auth Guard)

**Files:**
- Create: `middleware.ts` (project root, next to `package.json`)

**Step 1: Create the file**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Already logged in → redirect away from login page
  if (user && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Not logged in → redirect to login (except login page itself)
  if (!user && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Step 2: Verify the file is in the right place**

Run: `ls middleware.ts`
Expected output: `middleware.ts` (file exists at project root)

**Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: restore admin auth middleware

Redirects unauthenticated users to /admin/login.
Redirects logged-in users away from /admin/login.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Update CartItem Type + localStorage Persistence

**Files:**
- Modify: `lib/cart-context.tsx` (full rewrite)

**Context:** The existing `CartItem` has `{ product, quantity }`. We need to add `selectedSize` so the same product in different sizes is a separate line item. We also need localStorage sync.

**Step 1: Replace the entire `lib/cart-context.tsx`**

```typescript
'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Product } from '@/types'

export interface CartItem {
  product: Product
  selectedSize: string | null
  quantity: number
}

// Stable key for a cart line item
export function cartItemKey(productId: string, selectedSize: string | null): string {
  return `${productId}::${selectedSize ?? 'no-size'}`
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: Product, selectedSize: string | null) => void
  removeFromCart: (productId: string, selectedSize: string | null) => void
  updateQuantity: (productId: string, selectedSize: string | null, quantity: number) => void
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setItems(loadFromStorage())
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever items change (skip before hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage full or unavailable — silent fail
    }
  }, [items, hydrated])

  const addToCart = useCallback((product: Product, selectedSize: string | null) => {
    setItems(prev => {
      const key = cartItemKey(product.id, selectedSize)
      const existing = prev.find(
        item => cartItemKey(item.product.id, item.selectedSize) === key
      )
      if (existing) {
        return prev.map(item =>
          cartItemKey(item.product.id, item.selectedSize) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, selectedSize, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string, selectedSize: string | null) => {
    const key = cartItemKey(productId, selectedSize)
    setItems(prev => prev.filter(
      item => cartItemKey(item.product.id, item.selectedSize) !== key
    ))
  }, [])

  const updateQuantity = useCallback((
    productId: string,
    selectedSize: string | null,
    quantity: number
  ) => {
    const key = cartItemKey(productId, selectedSize)
    if (quantity <= 0) {
      setItems(prev => prev.filter(
        item => cartItemKey(item.product.id, item.selectedSize) !== key
      ))
    } else {
      setItems(prev =>
        prev.map(item =>
          cartItemKey(item.product.id, item.selectedSize) === key
            ? { ...item, quantity }
            : item
        )
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
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
```

**Step 2: Wrap layout with CartProvider**

Open `app/layout.tsx`. Replace the entire file with:

```typescript
import type { Metadata } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/lib/cart-context"

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Enchanted Style — Women's Fashion Lebanon",
  description:
    "Curated women's fashion from Lebanon. Heels, boots, dresses, tops & accessories. Where glamour meets edge. Order via WhatsApp.",
  keywords: ["women's fashion", "Lebanon", "heels", "dresses", "boots", "accessories", "enchanted style"],
  openGraph: {
    title: "Enchanted Style",
    description: "Curated women's fashion from Lebanon. Where glamour meets edge.",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${playfair.variable} ${dmSans.variable} antialiased`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add lib/cart-context.tsx app/layout.tsx
git commit -m "feat: add localStorage persistence + size support to CartContext

CartItem now tracks selectedSize for per-size line items.
Cart hydrates from and persists to localStorage.
CartProvider wraps the root layout.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add buildCartOrderURL to whatsapp.ts

**Files:**
- Modify: `lib/whatsapp.ts`

**Step 1: Append the new function to `lib/whatsapp.ts`**

```typescript
// ============================================================
// ENCHANTED STYLE — WhatsApp Integration
// ============================================================

export const WHATSAPP_PHONE = '96181351084'

/** Build a WhatsApp URL with product pre-fill message */
export function buildWhatsAppURL(productName: string): string {
  const message = `Hi! I'm interested in ${productName} from Enchanted Style 💫`
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

/** Direct WhatsApp link (for floating button) */
export const WHATSAPP_FLOAT_URL = `https://wa.me/${WHATSAPP_PHONE}`

/** Build a WhatsApp cart order URL with all items pre-filled */
export function buildCartOrderURL(items: Array<{
  product: { name: string; price: number | null }
  selectedSize: string | null
  quantity: number
}>): string {
  const lines = items.map(({ product, selectedSize, quantity }) => {
    const price = product.price != null ? `$${(product.price * quantity).toFixed(2)}` : 'Price TBD'
    const size = selectedSize ? ` — Size ${selectedSize}` : ''
    return `• ${product.name}${size} × ${quantity} — ${price}`
  })

  const total = items.reduce((sum, { product, quantity }) => {
    return sum + (product.price ?? 0) * quantity
  }, 0)

  const message = [
    "Hi! I'd like to place an order from Enchanted Style 💫",
    '',
    'Items:',
    ...lines,
    '',
    `Total: $${total.toFixed(2)}`,
    '',
    'Please confirm availability!',
  ].join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp.ts
git commit -m "feat: add buildCartOrderURL for WhatsApp cart checkout

Generates pre-filled WhatsApp message with all cart items,
sizes, quantities, and total price.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create CartDrawer Component

**Files:**
- Create: `components/public/CartDrawer.tsx`

**Step 1: Create the file**

```typescript
'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useCart } from '@/lib/cart-context'
import { buildCartOrderURL } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, clearCart } = useCart()

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0
  )

  const whatsappURL = buildCartOrderURL(items)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, closeCart])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/70 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[70] bg-[#111111] border-l border-[#2a2a2a] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="font-display text-lg text-white tracking-wide">Your Cart</h2>
          <button
            onClick={closeCart}
            className="text-white/50 hover:text-white transition-colors text-2xl leading-none"
            aria-label="Close cart"
            data-hover
          >
            ×
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-white/30 text-sm tracking-wide">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="mt-4 text-[#c9a84c] text-xs uppercase tracking-widest hover:text-[#f0d060] transition-colors"
                data-hover
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div
                key={`${item.product.id}-${item.selectedSize ?? 'no-size'}`}
                className="flex gap-3 items-start pb-4 border-b border-[#2a2a2a] last:border-0"
              >
                {/* Product image */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a]">
                  {item.product.image_url ? (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-tight truncate">
                    {item.product.name}
                  </p>
                  {item.selectedSize && (
                    <p className="text-white/40 text-xs mt-0.5">Size: {item.selectedSize}</p>
                  )}
                  <p className="text-[#c9a84c] text-xs mt-1">
                    {formatPrice(item.product.price)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-[#3a3a3a] text-white/60 hover:text-white hover:border-[#c9a84c] transition-colors text-sm"
                      aria-label="Decrease quantity"
                      data-hover
                    >
                      −
                    </button>
                    <span className="text-white text-xs w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-[#3a3a3a] text-white/60 hover:text-white hover:border-[#c9a84c] transition-colors text-sm"
                      aria-label="Increase quantity"
                      data-hover
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                  className="text-white/30 hover:text-white/70 transition-colors mt-0.5 flex-shrink-0"
                  aria-label="Remove item"
                  data-hover
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[#2a2a2a] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm tracking-wide">Subtotal</span>
              <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
            </div>

            <a
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={clearCart}
              data-hover
              className="w-full flex items-center justify-center gap-2 bg-[#c9a84c] hover:bg-[#f0d060] text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Order via WhatsApp
            </a>

            <button
              onClick={clearCart}
              className="w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors tracking-wide"
              data-hover
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}
```

**Step 2: Render CartDrawer in `app/page.tsx`**

Add `import CartDrawer from "@/components/public/CartDrawer"` at the top of `app/page.tsx`.

Then inside the returned JSX, add `<CartDrawer />` right before `<WhatsAppFloat />`:

```tsx
      {/* ...existing JSX... */}
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
```

**Step 3: Commit**

```bash
git add components/public/CartDrawer.tsx app/page.tsx
git commit -m "feat: add CartDrawer with WhatsApp order checkout

Slide-in cart drawer with item management, quantity controls,
subtotal, and 'Order via WhatsApp' CTA that sends full cart summary.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update ProductCard — Size Picker + Add to Cart

**Files:**
- Modify: `components/public/ProductCard.tsx`

**Context:** Replace the current "Order via WhatsApp" button with a size picker (if product has sizes) + "Add to Cart" button. Keep the tilt/3D effect and all existing image/badge logic intact.

**Step 1: Replace `components/public/ProductCard.tsx`**

```typescript
'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const { addToCart, openCart } = useCart()

  const hasSizes = product.sizes && product.sizes.length > 0

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.transform = `rotateY(${x * 15}deg) rotateX(${-y * 15}deg) scale3d(1.02, 1.02, 1.02)`
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)'
  }

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) return // guard: must pick size first
    addToCart(product, selectedSize)
    setAdded(true)
    openCart()
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{ perspective: '1000px' }}>
      <div
        ref={cardRef}
        className="product-card-inner rounded-xl overflow-hidden bg-[#161616] border border-[#2a2a2a] group cursor-pointer transition-transform duration-200"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image section */}
        <div className="relative h-64 overflow-hidden">
          {!imgError && product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
              <svg className="w-12 h-12 text-white/10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            </div>
          )}

          {product.is_featured && (
            <span className="absolute top-2 left-2 bg-[#c9a84c] text-black text-xs px-2 py-1 uppercase tracking-wider font-medium rounded z-10">
              Featured
            </span>
          )}

          <div className="product-card-shine rounded-xl" />
        </div>

        {/* Content section */}
        <div className="p-4">
          {product.category?.name && (
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
              {product.category.name}
            </p>
          )}

          <h3 className="font-display text-white text-lg leading-tight mb-2">
            {product.name}
          </h3>

          <p className="text-[#c9a84c] font-medium">
            {formatPrice(product.price)}
          </p>

          {/* Size picker */}
          {hasSizes && (
            <div className="flex flex-wrap gap-1 mt-3">
              {product.sizes!.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(prev => prev === size ? null : size)}
                  data-hover
                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide border transition-all duration-150 ${
                    selectedSize === size
                      ? 'bg-[#c9a84c] border-[#c9a84c] text-black font-semibold'
                      : 'text-white/50 border-white/20 hover:border-[#c9a84c] hover:text-[#c9a84c]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={hasSizes ? !selectedSize : false}
            data-hover
            className={`mt-3 w-full flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-semibold py-2.5 rounded-lg transition-all duration-200 active:scale-95 ${
              added
                ? 'bg-green-600 text-white'
                : hasSizes && !selectedSize
                ? 'bg-[#2a2a2a] text-white/30 cursor-not-allowed'
                : 'bg-[#c9a84c] hover:bg-[#f0d060] text-black'
            }`}
          >
            {added ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                </svg>
                {hasSizes && !selectedSize ? 'Select a size' : 'Add to Cart'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/public/ProductCard.tsx
git commit -m "feat: add size picker and Add to Cart to ProductCard

Size pills highlight on selection. Add to Cart is disabled until
a size is selected. Opens cart drawer on add with 'Added!' flash.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Update Navbar — Cart Icon + Mobile Menu

**Files:**
- Modify: `components/public/Navbar.tsx`

**Context:** Add a cart icon with item count badge to the right side. Add a full mobile menu drawer that slides in from the right with nav links + WhatsApp CTA. Wire the existing hamburger button.

**Step 1: Replace `components/public/Navbar.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { WHATSAPP_FLOAT_URL } from '@/lib/whatsapp'

const NAV_LINKS = [
  { label: 'Collections', href: '#catalog' },
  { label: 'New Arrivals', href: '#new' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems, openCart } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled ? 'nav-glass' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
          {/* LEFT: Logo */}
          <a href="/" className="flex-shrink-0" data-hover>
            {!imgError ? (
              <img
                src="/logo.png"
                alt="Enchanted Style"
                className="h-10 w-auto object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <span
                className="font-display text-xl tracking-widest uppercase"
                style={{ color: 'var(--color-gold, #c9a84c)' }}
              >
                ENCHANTED STYLE
              </span>
            )}
          </a>

          {/* CENTER: Nav links (desktop only) */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                data-hover
                className="text-sm tracking-widest uppercase text-white/70 hover:text-[#c9a84c] transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </div>

          {/* RIGHT: WhatsApp + Cart + Hamburger */}
          <div className="flex items-center gap-3">
            {/* WhatsApp CTA (desktop) */}
            <a
              href="https://wa.me/96181351084"
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              className="hidden sm:inline-flex items-center gap-2 border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded-full transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>

            {/* Cart icon */}
            <button
              onClick={openCart}
              className="relative text-white/70 hover:text-[#c9a84c] transition-colors p-1"
              aria-label={`Open cart (${totalItems} items)`}
              data-hover
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c9a84c] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white/70 hover:text-white transition-colors p-1"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
              data-hover
            >
              {menuOpen ? (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/60 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile menu drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-[56] bg-[#111111] border-l border-[#2a2a2a] flex flex-col pt-20 pb-8 px-6 transition-transform duration-300 ease-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <nav className="flex flex-col gap-6 flex-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              data-hover
              className="text-white/70 hover:text-[#c9a84c] text-sm uppercase tracking-[0.3em] transition-colors duration-200 font-medium"
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href={WHATSAPP_FLOAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMenu}
          data-hover
          className="flex items-center justify-center gap-2 bg-[#c9a84c] hover:bg-[#f0d060] text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Chat on WhatsApp
        </a>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add components/public/Navbar.tsx
git commit -m "feat: add cart icon + badge and mobile menu drawer to Navbar

Cart icon shows item count badge. Mobile hamburger now opens a
slide-in drawer with nav links and WhatsApp CTA button.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: New Arrivals Section

**Files:**
- Create: `components/public/NewArrivals.tsx`
- Modify: `app/page.tsx`

**Step 1: Create `components/public/NewArrivals.tsx`**

```typescript
'use client'

import ProductCard from '@/components/public/ProductCard'
import type { Product } from '@/types'

interface NewArrivalsProps {
  products: Product[]
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (products.length === 0) return null

  return (
    <section id="new" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-[#c9a84c] text-xs tracking-widest uppercase mb-3">
          Just Dropped
        </p>
        <h2 className="font-display text-4xl lg:text-5xl text-white mb-4">
          New Arrivals
        </h2>
        <div className="section-divider" />
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible scrollbar-none">
        {products.map(product => (
          <div
            key={product.id}
            className="flex-shrink-0 w-56 md:w-auto"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
```

**Step 2: Add CSS for `scrollbar-none` in `app/globals.css`**

Append to the end of `app/globals.css`:

```css
/* Hide scrollbar for horizontal scroll containers */
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
```

**Step 3: Update `app/page.tsx`**

Add import at top:
```typescript
import NewArrivals from "@/components/public/NewArrivals"
```

After computing `products` array (after the if/else block), derive new arrivals:
```typescript
  // 5 most recently added active products for New Arrivals
  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
```

Then in the JSX, add `<NewArrivals products={newArrivals} />` between `<Hero />` and `<ProductGrid .../>`:

```tsx
        <Hero />
        <NewArrivals products={newArrivals} />
        <ProductGrid products={products} categories={categories} />
```

**Step 4: Commit**

```bash
git add components/public/NewArrivals.tsx app/page.tsx app/globals.css
git commit -m "feat: add New Arrivals section showing 5 most recent products

Horizontal scroll on mobile, 5-column grid on desktop.
Anchored at #new for navbar link. Uses existing ProductCard.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Image Lightbox for Additional Product Images

**Files:**
- Create: `components/public/ImageLightbox.tsx`
- Modify: `components/public/ProductCard.tsx`

**Step 1: Create `components/public/ImageLightbox.tsx`**

```typescript
'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'

interface ImageLightboxProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const prev = useCallback(() => {
    onNavigate(currentIndex === 0 ? images.length - 1 : currentIndex - 1)
  }, [currentIndex, images.length, onNavigate])

  const next = useCallback(() => {
    onNavigate(currentIndex === images.length - 1 ? 0 : currentIndex + 1)
  }, [currentIndex, images.length, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Image container — stop propagation so clicking image doesn't close */}
      <div
        className="relative w-full max-w-3xl max-h-[85vh] mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full h-[70vh]">
          <Image
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${images.length}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 75vw"
          />
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i === currentIndex ? 'bg-[#c9a84c] w-4' : 'bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Next image"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all text-xl"
        aria-label="Close lightbox"
      >
        ×
      </button>
    </div>
  )
}
```

**Step 2: Add lightbox state and trigger to `components/public/ProductCard.tsx`**

In the existing `ProductCard`, after the `added` state declaration, add:

```typescript
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.additional_images ?? []),
  ]
  const hasGallery = allImages.length > 1
```

Add `import ImageLightbox from '@/components/public/ImageLightbox'` at the top.

Make the image section clickable when there's a gallery — wrap the image `<div className="relative h-64 overflow-hidden">` opening tag to add `onClick` and cursor:

```tsx
        <div
          className={`relative h-64 overflow-hidden ${hasGallery ? 'cursor-zoom-in' : ''}`}
          onClick={hasGallery ? () => setLightboxIndex(0) : undefined}
        >
```

At the end of the component, just before the closing `</div>` of the outer wrapper, add:

```tsx
      {lightboxIndex !== null && (
        <ImageLightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
```

**Step 3: Commit**

```bash
git add components/public/ImageLightbox.tsx components/public/ProductCard.tsx
git commit -m "feat: add image lightbox for products with additional images

Clicking the product image opens a fullscreen lightbox with
arrow navigation, dot indicators, and keyboard support (Esc/arrows).
Only activates for products that have additional_images.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Smoke Test

**Step 1: Start the dev server**

```bash
npm run dev
```

Expected output: `▲ Next.js 16.1.6` ... `Local: http://localhost:3000`

**Step 2: Manual verification checklist**

Open `http://localhost:3000` and verify:

- [ ] Homepage loads without errors
- [ ] New Arrivals section appears between Hero and product grid
- [ ] `#new` anchor in nav scrolls to New Arrivals
- [ ] Navbar cart icon visible (0 count, no badge)
- [ ] Mobile viewport (≤768px): hamburger opens slide-in drawer with nav links + WhatsApp button
- [ ] Product card shows size pills (for products with sizes)
- [ ] Clicking a size pill highlights it gold
- [ ] "Select a size" shows grayed button when no size selected; "Add to Cart" appears after selection
- [ ] Adding to cart: cart drawer slides in, item appears, count badge shows in navbar
- [ ] Quantity +/- works in cart drawer
- [ ] "Order via WhatsApp" generates correct pre-filled message
- [ ] Products with multiple images: click image → lightbox opens; arrows/dots/Esc work
- [ ] Cart persists after page refresh (localStorage)

**Step 3: Verify admin protection (if Supabase is configured)**

Navigate to `http://localhost:3000/admin/dashboard` without logging in.
Expected: Redirect to `/admin/login`

---

## Summary

| Task | Files Changed | Commit |
|------|--------------|--------|
| 1 | `middleware.ts` (new) | `feat: restore admin auth middleware` |
| 2 | `lib/cart-context.tsx`, `app/layout.tsx` | `feat: add localStorage persistence + size support` |
| 3 | `lib/whatsapp.ts` | `feat: add buildCartOrderURL` |
| 4 | `components/public/CartDrawer.tsx` (new), `app/page.tsx` | `feat: add CartDrawer` |
| 5 | `components/public/ProductCard.tsx` | `feat: add size picker and Add to Cart` |
| 6 | `components/public/Navbar.tsx` | `feat: add cart icon + mobile menu` |
| 7 | `components/public/NewArrivals.tsx` (new), `app/page.tsx`, `app/globals.css` | `feat: add New Arrivals section` |
| 8 | `components/public/ImageLightbox.tsx` (new), `components/public/ProductCard.tsx` | `feat: add image lightbox` |
| 9 | — | Smoke test |
