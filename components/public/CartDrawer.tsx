"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Minus, Plus, Trash, ArrowLeft, Check } from "@phosphor-icons/react/ssr"
import { cartItemKey, useCart } from "@/lib/cart-context"
import { useOverlay } from "@/lib/use-overlay"
import { useAuth } from "@/lib/auth-context"
import AuthModal from "./AuthModal"
import { pricePresentation } from "@/lib/promotions"
import type { CustomerAddress } from "@/lib/customer-data"
import CartRecommendations from "./CartRecommendations"
import { captureCommerceEvent } from "@/components/analytics/commerce"

type DrawerState = "cart" | "auth-required" | "details" | "success"

const money = (n: number) => `$${n.toFixed(2)}`

const RESUME_KEY = "enchanted_resume_checkout"

export default function CartDrawer() {
  const { items, isOpen, openCart, closeCart, removeFromCart, updateQuantity, clearCart } =
    useCart()
  const { user } = useAuth()

  const [drawerState, setDrawerState] = useState<DrawerState>("cart")
  const [authOpen, setAuthOpen] = useState(false)

  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [orderNotes, setOrderNotes] = useState("")

  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null)
  const checkoutKey = useRef<string | null>(null)
  const whatsappUrl = "https://wa.me/96181492994"

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0,
  )
  const deliveryFee = 4
  const total = subtotal + deliveryFee

  const dialogRef = useOverlay<HTMLDivElement>(isOpen, handleClose)

  /**
   * Google sign in is a full page redirect, so every field in this component is
   * destroyed and the customer lands back on the homepage with her cart intact
   * but the drawer closed and no sign she was mid checkout.
   *
   * Reaching the auth wall stores only a checkout-resume marker. Personal data
   * remains in the authenticated D1 address book and is never put in browser
   * session storage.
   */
  useEffect(() => {
    if (drawerState !== "auth-required") return
    try {
      window.sessionStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ checkout: true }),
      )
    } catch {
      /* private mode: she reopens the cart herself */
    }
  }, [drawerState])

  useEffect(() => {
    if (!user || items.length === 0) return
    let raw: string | null = null
    try {
      raw = window.sessionStorage.getItem(RESUME_KEY)
      if (raw) window.sessionStorage.removeItem(RESUME_KEY)
    } catch {
      return
    }
    if (!raw) return
    try {
      JSON.parse(raw)
      setDrawerState("details")
      openCart()
    } catch {
      /* unreadable marker, fall through to the normal closed state */
    }
  }, [user, items.length, openCart])

  // Signing in from the auth wall should drop the customer straight into details
  useEffect(() => {
    if (user && drawerState === "auth-required") setDrawerState("details")
  }, [user, drawerState])

  useEffect(() => {
    if (!user || drawerState !== "details") return
    let cancelled = false
    setAddressesLoading(true)
    void fetch('/api/account/addresses', { credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json() as { addresses?: CustomerAddress[] }
        if (!response.ok || !Array.isArray(data.addresses)) throw new Error()
        if (cancelled) return
        setAddresses(data.addresses)
        setSelectedAddressId((current) =>
          current && data.addresses!.some((address) => address.id === current)
            ? current
            : (data.addresses!.find((address) => address.isDefault)?.id ?? data.addresses![0]?.id ?? null),
        )
      })
      .catch(() => {
        if (!cancelled) setPlaceError('We could not load your saved addresses.')
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false)
      })
    return () => { cancelled = true }
  }, [user, drawerState])

  /**
   * Leaving a placed order by any route clears the cart, including the X button.
   * Previously only "Continue shopping" cleared it, so closing with X left the
   * basket full and invited a duplicate order on reopen.
   */
  function handleClose() {
    if (drawerState === "success") {
      clearCart()
      setDrawerState("cart")
      setOrderNumber(null)
      setConfirmedTotal(null)
      checkoutKey.current = null
    }
    closeCart()
  }

  function startCheckout() {
    if (items.length === 0) return
    captureCommerceEvent('checkout_started', { item_count: items.length, subtotal, total })
    setDrawerState(user ? "details" : "auth-required")
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    // A session can lapse while the form is being filled. Returning silently left the
    // button doing nothing at all, so say what happened and route back to sign in.
    if (!user) {
      setPlaceError("Your session expired. Sign in again to place this order.")
      setDrawerState("auth-required")
      return
    }
    if (!selectedAddressId) {
      setPlaceError('Add or choose a saved delivery address before placing the order.')
      return
    }
    setPlacing(true)
    setPlaceError(null)
    checkoutKey.current ??= crypto.randomUUID()

    const orderItems = items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      size: item.selectedSize,
      qty: item.quantity,
      price: item.product.price ?? 0,
      ...(item.selectedColor
        ? {
            color_id: item.selectedColor.id,
            color_name: item.selectedColor.name,
            color_hex: item.selectedColor.hex_code,
          }
        : {}),
      ...(item.selectedVariantId ? { variant_id: item.selectedVariantId } : {}),
    }))

    const payload = {
      address_id: selectedAddressId,
      order_notes: orderNotes.trim() || null,
      items: orderItems,
      subtotal,
      total,
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": checkoutKey.current },
        body: JSON.stringify(payload),
      })
      const responseBody: unknown = await res.json()
      const data: Record<string, unknown> =
        typeof responseBody === "object" && responseBody !== null
          ? responseBody as Record<string, unknown>
          : {}
      if (!res.ok) {
        setPlaceError(
          typeof data.error === "string"
            ? data.error
            : "We could not place that order. Please try again.",
        )
        setPlacing(false)
        return
      }

      setOrderNumber(
        typeof data.order_number === "string"
          ? data.order_number
          : typeof data.id === "string"
            ? data.id
            : null,
      )
      setConfirmedTotal(typeof data.total === "number" ? data.total : total)
      captureCommerceEvent('order_submitted', {
        item_count: items.length,
        total: typeof data.total === "number" ? data.total : total,
        payment_method: 'cash_on_delivery',
      })

      setDrawerState("success")
    } catch {
      setPlaceError("Network error. Check your connection and try again.")
    } finally {
      setPlacing(false)
    }
  }

  const titles: Record<DrawerState, string> = {
    cart: "Your cart",
    "auth-required": "Sign in to order",
    details: "Delivery details",
    success: "Order placed",
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] ${isOpen ? "" : "pointer-events-none"}`}
        inert={!isOpen}
      >
        <button
          tabIndex={-1}
          aria-hidden="true"
          onClick={handleClose}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={dialogRef}
          data-sensitive
          data-ph-no-capture
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={titles[drawerState]}
          className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-paper-raised transition-transform duration-400 ease-[cubic-bezier(.16,1,.3,1)] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5">
            <div className="flex items-center gap-3">
              {(drawerState === "details" || drawerState === "auth-required") && (
                <button
                  onClick={() => setDrawerState("cart")}
                  className="flex h-9 w-9 items-center justify-center text-ink-dim hover:text-ink"
                  aria-label="Back to cart"
                >
                  <ArrowLeft size={17} weight="light" />
                </button>
              )}
              <h2 className="t-meta text-ink">{titles[drawerState]}</h2>
            </div>
            <button
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center text-ink"
              aria-label="Close cart"
            >
              <X size={19} weight="light" />
            </button>
          </div>

          {/* ---- CART ---- */}
          {drawerState === "cart" && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-start justify-center gap-4 px-5">
                    <p className="text-xl text-ink">Your cart is empty.</p>
                    <p className="t-body text-[0.9375rem]">
                      Pick a size on any piece in the catalog and it will land here.
                    </p>
                    <Link href="/#catalog" onClick={handleClose} className="btn btn-ghost mt-2">
                      Shop All
                    </Link>
                  </div>
                ) : (
                  <ul>
                    {items.map((item) => (
                      <li
                        key={cartItemKey(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor?.id,
                        )}
                        className="flex gap-4 border-b border-line p-5"
                      >
                        <div className="relative h-28 w-20 shrink-0 bg-paper-sunken">
                          {(item.selectedColor?.image_url ?? item.product.image_url) && (
                            <Image
                              src={item.selectedColor?.image_url ?? item.product.image_url!}
                              alt={item.product.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-[0.9375rem] leading-snug text-ink">
                            {item.product.name}
                          </p>
                          {item.selectedSize && (
                            <p className="t-meta mt-1">Size {item.selectedSize}</p>
                          )}
                          {item.selectedColor && (
                            <p className="t-meta mt-1 flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full border border-line-strong"
                                style={{ backgroundColor: item.selectedColor.hex_code }}
                              />
                              Color {item.selectedColor.name}
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                            <div className="flex items-center border border-line">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.selectedSize,
                                    item.quantity - 1,
                                    item.selectedColor?.id,
                                  )
                                }
                                className="flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink"
                                aria-label={`Reduce quantity of ${item.product.name}`}
                              >
                                <Minus size={15} weight="light" />
                              </button>
                              <span className="tnum w-10 text-center text-[0.875rem] text-ink">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.selectedSize,
                                    item.quantity + 1,
                                    item.selectedColor?.id,
                                  )
                                }
                                className="flex h-11 w-11 items-center justify-center text-ink-dim hover:text-ink"
                                aria-label={`Increase quantity of ${item.product.name}`}
                              >
                                <Plus size={15} weight="light" />
                              </button>
                            </div>

                            <p className="tnum text-[0.9375rem] text-ink">
                              {money((item.product.price ?? 0) * item.quantity)}
                            </p>
                          </div>
                          {pricePresentation(item.product).discountPercent != null && (
                            <p className="mt-2 text-[0.6875rem] text-signal-ok">
                              {pricePresentation(item.product).discountPercent}% off — best active discount applied
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => removeFromCart(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor?.id,
                          )}
                          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-faint transition-colors hover:text-signal-error"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash size={16} weight="light" />
                        </button>
                      </li>
                    ))}
                    <li className="px-5 pb-5">
                      <CartRecommendations
                        sourceProductId={items[0]?.product.id ?? null}
                        onNavigate={handleClose}
                      />
                    </li>
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="shrink-0 border-t border-line p-5">
                  <p className="t-meta mb-4 normal-case tracking-normal">
                    $4 delivery anywhere in Lebanon · cash on delivery
                  </p>
                  <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem]">
                    <div className="flex justify-between">
                      <dt className="text-ink-dim">Subtotal</dt>
                      <dd className="tnum text-ink">{money(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-dim">Delivery</dt>
                      <dd className="tnum text-ink">{money(deliveryFee)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3">
                      <dt className="text-ink">Total</dt>
                      <dd className="tnum text-ink">{money(total)}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={startCheckout}
                    className="btn btn-primary mt-5 w-full"
                  >
                    Continue to delivery details
                  </button>
                </div>
              )}
            </>
          )}

          {/* ---- AUTH WALL ---- */}
          {drawerState === "auth-required" && (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
              <p className="text-xl text-ink">Sign in to place the order.</p>
              <p className="t-body text-[0.9375rem]">
                We attach the order to your account so you can check its status later,
                and so we have a name and number to deliver to.
              </p>
              <button onClick={() => setAuthOpen(true)} className="btn btn-primary mt-2 w-full">
                Sign in
              </button>
              <button onClick={() => setDrawerState("cart")} className="btn btn-ghost w-full">
                Back to cart
              </button>
            </div>
          )}

          {/* ---- DETAILS ---- */}
          {drawerState === "details" && (
            <form onSubmit={placeOrder} aria-busy={placing} className="flex min-h-0 flex-1 flex-col">
              <fieldset disabled={placing} className="min-h-0 flex-1 overflow-y-auto border-0 p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="t-meta">Saved delivery address</legend>
                    <Link href="/account/addresses" onClick={handleClose} className="t-meta link-grow text-ink-dim hover:text-ink">
                      Manage
                    </Link>
                  </div>

                  {addressesLoading ? (
                    <div className="skeleton h-28 w-full" aria-label="Loading saved addresses" />
                  ) : addresses.length === 0 ? (
                    <div className="border border-line p-5">
                      <p className="text-sm text-ink">Add a delivery address to continue.</p>
                      <p className="t-body mt-2 text-sm">Your cart will stay saved while you add it.</p>
                      <Link href="/account/addresses" onClick={handleClose} className="btn btn-primary mt-4 w-full">
                        Add delivery address
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {addresses.map((address) => (
                        <label key={address.id} className={`cursor-pointer border p-4 ${selectedAddressId === address.id ? 'border-ink bg-paper-sunken' : 'border-line'}`}>
                          <span className="flex gap-3">
                            <input
                              type="radio"
                              name="checkout-address"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-1 accent-ink"
                            />
                            <span>
                              <span className="block text-sm text-ink">{address.label}{address.isDefault ? ' · Default' : ''}</span>
                              <span className="mt-1 block text-xs leading-5 text-ink-dim">
                                {address.recipientName} · {address.phone}<br />
                                {address.street}, {address.area}, {address.city}
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div>
                    <label htmlFor="ord-notes" className="t-meta mb-1.5 block">
                      Notes, optional
                    </label>
                    <textarea
                      id="ord-notes"
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Anything we should know"
                      className="field resize-none"
                    />
                  </div>
                </div>

                <dl className="mt-7 flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem]">
                  <div className="flex justify-between">
                    <dt className="text-ink-dim">Subtotal</dt>
                    <dd className="tnum text-ink">{money(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-dim">Delivery anywhere in Lebanon</dt>
                    <dd className="tnum text-ink">{money(deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-3">
                    <dt className="text-ink">Total, cash on delivery</dt>
                    <dd className="tnum text-ink">{money(total)}</dd>
                  </div>
                </dl>
              </fieldset>

              <div className="shrink-0 border-t border-line p-5">
                {placeError && (
                  <p
                    role="alert"
                    className="mb-3 border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error"
                  >
                    {placeError}
                  </p>
                )}
                <button type="submit" disabled={placing || !selectedAddressId} className="btn btn-primary w-full">
                  {placing ? "Placing order" : `Place order, ${money(total)}`}
                </button>
                <p className="t-meta mt-2.5 text-center normal-case tracking-normal">
                  Your order will appear as awaiting confirmation in your account.
                </p>
              </div>
            </form>
          )}

          {/* ---- SUCCESS ---- */}
          {drawerState === "success" && (
            <div className="flex flex-1 flex-col justify-center overflow-y-auto px-5 py-8">
              <div className="flex h-12 w-12 items-center justify-center border border-signal-ok text-signal-ok">
                <Check size={22} weight="light" />
              </div>
              <p className="mt-5 text-xl text-ink">Order saved.</p>
              <p className="t-body mt-3 text-[0.9375rem]">
                Your order is awaiting confirmation. We sent the order number to your
                email and will email you again whenever its status changes. Stock is
                reserved for 24 hours while the order awaits confirmation.
              </p>

              <dl className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem]">
                {orderNumber && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-dim">Reference</dt>
                    <dd className="tnum truncate text-ink">{orderNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-dim">Total due</dt>
                  <dd className="tnum text-ink">{money(confirmedTotal ?? total)}</dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-col gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full"
                >
                  Contact us on WhatsApp
                </a>
                <p className="t-meta mb-1 text-center normal-case tracking-normal">
                  +961 81 492 994
                </p>
                <Link href="/orders" className="btn btn-ghost w-full" onClick={handleClose}>
                  See your orders
                </Link>
                <Link href="/track-order" className="btn btn-ghost w-full" onClick={handleClose}>
                  Track an order
                </Link>
                <button
                  onClick={() => {
                    clearCart()
                    setDrawerState("cart")
                    setOrderNumber(null)
                    setConfirmedTotal(null)
                    checkoutKey.current = null
                    closeCart()
                  }}
                  className="btn btn-ghost w-full"
                >
                  Continue shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
