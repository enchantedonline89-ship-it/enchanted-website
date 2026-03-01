'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useCart, cartItemKey } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import AuthModal from '@/components/public/AuthModal'
import {
  WHATSAPP_PHONE,
  buildOwnerNotificationURL,
  buildCustomerConfirmationURL,
  type OrderPayload,
} from '@/lib/whatsapp'
import { formatPrice } from '@/lib/utils'

// ─── Whish payment WhatsApp link ──────────────────────────────
const WHISH_WA_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hi! I'd like to arrange a Whish payment for my order."
)}`

// ─── Drawer state ─────────────────────────────────────────────
type DrawerState = 'cart' | 'details' | 'success' | 'auth-required'

// ─── Component ────────────────────────────────────────────────
export default function CartDrawer() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, clearCart } = useCart()
  const { user, loading } = useAuth()

  // Drawer state machine
  const [drawerState, setDrawerState] = useState<DrawerState>('cart')

  // Step 1: delivery area
  const [area, setArea] = useState<'beirut' | 'outside' | null>(null)
  const [city, setCity] = useState('')

  // Step 2: customer details
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  // Submission state
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  // When drawer opens, decide initial state
  useEffect(() => {
    if (!isOpen) return
    if (!loading && !user) {
      setDrawerState('auth-required')
    } else if (!loading && user) {
      // Pre-fill name from user metadata
      setFullName(user.user_metadata?.full_name ?? '')
      setDrawerState('cart')
    }
  }, [isOpen, user, loading])

  // When user signs in while drawer is open in auth-required state, advance to cart
  useEffect(() => {
    if (isOpen && drawerState === 'auth-required' && user && !loading) {
      setFullName(user.user_metadata?.full_name ?? '')
      setDrawerState('cart')
    }
  }, [user, loading, isOpen, drawerState])

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
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ─── Derived values ───────────────────────────────────────
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0
  )
  const deliveryFee = area === 'beirut' ? 3 : area === 'outside' ? 4 : 0
  const total = subtotal + deliveryFee

  // ─── Place order handler ──────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user) return
    setPlacing(true)
    setPlaceError(null)

    const orderItems = items.map(item => ({
      name: item.product.name,
      size: item.selectedSize,
      qty: item.quantity,
      price: item.product.price ?? 0,
    }))

    const payload = {
      user_id: user.id,
      user_email: user.email ?? '',
      full_name: fullName.trim(),
      phone: phone.trim(),
      delivery_address: deliveryAddress.trim(),
      city: area === 'outside' ? city.trim() || null : null,
      area: area as 'beirut' | 'outside',
      delivery_fee: deliveryFee,
      order_notes: orderNotes.trim() || null,
      items: orderItems,
      subtotal,
      total,
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlaceError(data.error ?? 'Failed to place order. Please try again.')
        setPlacing(false)
        return
      }

      setOrderId(data.id)

      // Open owner notification in WhatsApp
      const ownerPayload: OrderPayload = {
        full_name: fullName.trim(),
        user_email: user.email ?? '',
        phone: phone.trim(),
        area: area as 'beirut' | 'outside',
        city: area === 'outside' ? city.trim() || null : null,
        delivery_address: deliveryAddress.trim(),
        order_notes: orderNotes.trim() || null,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      }
      window.open(buildOwnerNotificationURL(ownerPayload), '_blank')

      setDrawerState('success')
    } catch {
      setPlaceError('Network error. Please check your connection and try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ─── Render helpers ───────────────────────────────────────

  function renderCartItems() {
    return items.map(item => (
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
          <p className="text-gold text-xs mt-1">{formatPrice(item.product.price)}</p>

          {/* Quantity controls */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() =>
                updateQuantity(item.product.id, item.selectedSize, item.quantity - 1)
              }
              className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:text-foreground hover:border-gold transition-colors text-sm"
              aria-label="Decrease quantity"
              data-hover
            >
              −
            </button>
            <span className="text-foreground text-xs w-4 text-center">{item.quantity}</span>
            <button
              onClick={() =>
                updateQuantity(item.product.id, item.selectedSize, item.quantity + 1)
              }
              className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted hover:text-foreground hover:border-gold transition-colors text-sm"
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
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    ))
  }

  // ─── State: auth-required ────────────────────────────────
  function renderAuthRequired() {
    return <AuthModal onClose={closeCart} />
  }

  // ─── State: cart (Step 1) ────────────────────────────────
  function renderCart() {
    const canProceed = items.length > 0 && area !== null

    return (
      <>
        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-subtle text-sm tracking-wide">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="mt-4 text-gold text-xs uppercase tracking-widest hover:text-gold-light transition-colors"
                data-hover
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            renderCartItems()
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-border space-y-4">
            {/* Delivery area selector */}
            <div>
              <p className="text-foreground text-xs font-medium uppercase tracking-wider mb-2">
                Delivery Area
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setArea('beirut')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    area === 'beirut'
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-surface border-border text-muted hover:border-gold/40'
                  }`}
                  data-hover
                >
                  Beirut — $3
                </button>
                <button
                  onClick={() => setArea('outside')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    area === 'outside'
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-surface border-border text-muted hover:border-gold/40'
                  }`}
                  data-hover
                >
                  Outside Beirut — $4
                </button>
              </div>
              {area === 'outside' && (
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City / Area (e.g. Tripoli)"
                  className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-gold transition-colors"
                />
              )}
            </div>

            {/* Order summary */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
              </div>
              {area !== null && (
                <div className="flex justify-between">
                  <span className="text-muted">Delivery</span>
                  <span className="text-foreground font-medium">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {area !== null && (
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-foreground font-semibold">Total</span>
                  <span className="text-gold font-semibold">{formatPrice(total)}</span>
                </div>
              )}
            </div>

            {/* Whish Money note */}
            <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-xs text-muted">
              Want to pay with Whish?{' '}
              <a
                href={WHISH_WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
              >
                Contact us on WhatsApp
              </a>{' '}
              to arrange payment before confirming.
            </div>

            {/* Proceed button */}
            <button
              onClick={() => setDrawerState('details')}
              disabled={!canProceed}
              title={!canProceed ? 'Please select your delivery area' : undefined}
              className={`w-full flex items-center justify-center gap-2 bg-gold text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 ${
                canProceed
                  ? 'hover:bg-gold-light cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              data-hover
            >
              Proceed to Checkout →
            </button>

            <button
              onClick={clearCart}
              className="w-full text-center text-subtle text-xs hover:text-muted transition-colors tracking-wide"
              data-hover
            >
              Clear cart
            </button>
          </div>
        )}
      </>
    )
  }

  // ─── State: details (Step 2) ─────────────────────────────
  function renderDetails() {
    const canSubmit =
      fullName.trim() !== '' &&
      phone.trim() !== '' &&
      deliveryAddress.trim() !== '' &&
      !placing

    return (
      <>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-b border-border">
          <span className="text-subtle text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-border inline-block" />
            Step 1
          </span>
          <span className="text-gold text-xs flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-gold inline-block" />
            Step 2
          </span>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Full Name <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Phone Number <span className="text-gold">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+961 XX XXX XXX"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Delivery Address <span className="text-gold">*</span>
            </label>
            <textarea
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Building, street, floor, apartment..."
              rows={2}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-gold transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Order Notes{' '}
              <span className="text-subtle font-normal">(optional)</span>
            </label>
            <textarea
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-gold transition-colors resize-none"
            />
          </div>

          {/* Order summary recap */}
          <div className="bg-surface border border-border rounded-lg px-3 py-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Delivery ({area === 'beirut' ? 'Beirut' : `Outside${city ? ` — ${city}` : ''}`})</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>Total</span>
              <span className="text-gold">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Error */}
          {placeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg">
              {placeError}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-border space-y-2">
          <button
            onClick={handlePlaceOrder}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 bg-gold text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 ${
              canSubmit
                ? 'hover:bg-gold-light cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            data-hover
          >
            {placing ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Placing Order...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Place Order
              </>
            )}
          </button>

          <button
            onClick={() => {
              setPlaceError(null)
              setDrawerState('cart')
            }}
            className="w-full flex items-center justify-center gap-1.5 border border-border text-muted text-xs py-2.5 rounded-lg hover:border-gold/40 hover:text-foreground transition-all"
            data-hover
          >
            ← Back
          </button>
        </div>
      </>
    )
  }

  // ─── State: success ──────────────────────────────────────
  function renderSuccess() {
    const shortId = orderId ? orderId.slice(0, 8) : '—'
    const confirmationURL = buildCustomerConfirmationURL(phone, fullName, total)

    return (
      <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h2 className="font-display text-2xl text-foreground mb-1">Order Placed!</h2>
        <p className="text-subtle text-xs mb-4 tracking-wide">
          Order ID: <span className="font-mono text-foreground">{shortId}</span>
        </p>

        {/* Summary */}
        <div className="bg-surface border border-border rounded-xl px-4 py-3 w-full text-xs text-left space-y-1 mb-5">
          <div className="flex justify-between text-muted">
            <span>Items</span>
            <span className="text-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Area</span>
            <span className="text-foreground">
              {area === 'beirut' ? 'Beirut' : `Outside Beirut${city ? ` — ${city}` : ''}`}
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
            <span className="text-foreground">Total</span>
            <span className="text-gold">{formatPrice(total)}</span>
          </div>
        </div>

        <p className="text-muted text-xs mb-6 max-w-xs leading-relaxed">
          The owner will contact you on WhatsApp to confirm delivery. Payment is Cash on Delivery.
        </p>

        {/* Customer confirmation button */}
        <a
          href={confirmationURL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 mb-1"
          data-hover
        >
          <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Send Confirmation to Customer
        </a>
        <p className="text-subtle text-xs mb-6">
          Click to send your customer a WhatsApp confirmation
        </p>

        {/* TODO: trigger Supabase email — requires email template config */}

        <div className="w-full border-t border-border my-2" />

        <button
          onClick={() => {
            clearCart()
            closeCart()
          }}
          className="mt-4 w-full border border-border text-muted text-xs py-2.5 rounded-lg hover:border-gold/40 hover:text-foreground transition-all"
          data-hover
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────
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
          <h2 className="font-display text-lg text-foreground tracking-wide">
            {drawerState === 'auth-required' && 'Sign in to order'}
            {drawerState === 'cart' && 'Your Cart'}
            {drawerState === 'details' && 'Checkout'}
            {drawerState === 'success' && 'Confirmed'}
          </h2>
          <button
            onClick={closeCart}
            className="text-muted hover:text-foreground transition-colors text-2xl leading-none"
            aria-label="Close cart"
            data-hover
          >
            ×
          </button>
        </div>

        {/* Step indicator for cart → details flow */}
        {(drawerState === 'cart' || drawerState === 'details') && items.length > 0 && (
          <div className="flex items-center justify-center gap-3 px-5 py-2 border-b border-border bg-surface">
            <span
              className={`text-xs flex items-center gap-1.5 ${
                drawerState === 'cart' ? 'text-gold font-medium' : 'text-subtle'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  drawerState === 'cart' ? 'bg-gold' : 'bg-border'
                }`}
              />
              Delivery
            </span>
            <span className="text-subtle text-xs">—</span>
            <span
              className={`text-xs flex items-center gap-1.5 ${
                drawerState === 'details' ? 'text-gold font-medium' : 'text-subtle'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  drawerState === 'details' ? 'bg-gold' : 'bg-border'
                }`}
              />
              Your Details
            </span>
          </div>
        )}

        {/* Body content */}
        {drawerState === 'auth-required' && renderAuthRequired()}
        {drawerState === 'cart' && renderCart()}
        {drawerState === 'details' && renderDetails()}
        {drawerState === 'success' && renderSuccess()}
      </div>
    </>
  )
}
