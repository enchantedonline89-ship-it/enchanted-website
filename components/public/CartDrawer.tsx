'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useCart, cartItemKey } from '@/lib/cart-context'
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
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-[70] bg-card border-l border-border flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg text-foreground tracking-wide">Your Cart</h2>
          <button
            onClick={closeCart}
            className="text-muted hover:text-foreground transition-colors text-2xl leading-none"
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
              <p className="text-subtle text-sm tracking-wide">Your cart is empty</p>
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
                key={cartItemKey(item.product.id, item.selectedSize)}
                className="flex gap-3 items-start pb-4 border-b border-border last:border-0"
              >
                {/* Product image */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
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
                      <svg className="w-6 h-6 text-subtle" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium leading-tight truncate">
                    {item.product.name}
                  </p>
                  {item.selectedSize && (
                    <p className="text-muted text-xs mt-0.5">Size: {item.selectedSize}</p>
                  )}
                  <p className="text-[#c9a84c] text-xs mt-1">
                    {formatPrice(item.product.price)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:text-foreground hover:border-[#c9a84c] transition-colors text-sm"
                      aria-label="Decrease quantity"
                      data-hover
                    >
                      −
                    </button>
                    <span className="text-foreground text-xs w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:text-foreground hover:border-[#c9a84c] transition-colors text-sm"
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
                  className="text-subtle hover:text-muted transition-colors mt-0.5 flex-shrink-0"
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
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted text-sm tracking-wide">Subtotal</span>
              <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
            </div>

            <a
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
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
              className="w-full text-center text-subtle text-xs hover:text-muted transition-colors tracking-wide"
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
