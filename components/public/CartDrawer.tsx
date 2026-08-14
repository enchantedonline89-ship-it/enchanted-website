"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Minus, Plus, Trash, ArrowLeft, Check } from "@phosphor-icons/react/ssr"
import { useCart } from "@/lib/cart-context"
import { useOverlay } from "@/lib/use-overlay"
import { useAuth } from "@/lib/auth-context"
import AuthModal from "./AuthModal"
import { buildOwnerNotificationURL, type OrderPayload } from "@/lib/whatsapp"
import { pricePresentation } from "@/lib/promotions"

type DrawerState = "cart" | "auth-required" | "details" | "success"

const money = (n: number) => `$${n.toFixed(2)}`

const RESUME_KEY = "enchanted_resume_checkout"

export default function CartDrawer() {
  const { items, isOpen, openCart, closeCart, removeFromCart, updateQuantity, clearCart } =
    useCart()
  const { user } = useAuth()

  const [drawerState, setDrawerState] = useState<DrawerState>("cart")
  const [authOpen, setAuthOpen] = useState(false)

  const [area, setArea] = useState<"beirut" | "outside" | null>(null)
  const [city, setCity] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [orderNotes, setOrderNotes] = useState("")

  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  // Held so the success screen can offer the handoff as a real anchor. window.open
  // fires after an awaited fetch, so its user-activation token is spent and mobile
  // browsers block it; the anchor is a fresh gesture and never blocked.
  const [ownerUrl, setOwnerUrl] = useState<string | null>(null)

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0,
  )
  const deliveryFee = area === null ? 0 : 4
  const total = subtotal + deliveryFee

  const dialogRef = useOverlay<HTMLDivElement>(isOpen, handleClose)

  /**
   * Google sign in is a full page redirect, so every field in this component is
   * destroyed and the customer lands back on the homepage with her cart intact
   * but the drawer closed and no sign she was mid checkout.
   *
   * Reaching the auth wall records the step and the delivery area, which is a
   * region choice rather than personal data. Name, phone and address are never
   * written to storage; she retypes those, which is the correct trade.
   */
  useEffect(() => {
    if (drawerState !== "auth-required") return
    try {
      window.sessionStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ area, city: city.trim() }),
      )
    } catch {
      /* private mode: she reopens the cart herself */
    }
  }, [drawerState, area, city])

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
      const saved = JSON.parse(raw) as { area: "beirut" | "outside" | null; city?: string }
      if (saved.area !== "beirut" && saved.area !== "outside") return
      setArea(saved.area)
      setCity(saved.city ?? "")
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
    }
    closeCart()
  }

  function startCheckout() {
    if (items.length === 0 || area === null) return
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
    setPlacing(true)
    setPlaceError(null)

    const orderItems = items.map((item) => ({
      product_id: item.product.id,
      name: item.product.name,
      size: item.selectedSize,
      qty: item.quantity,
      price: item.product.price ?? 0,
    }))

    const payload = {
      user_id: user.id,
      user_email: user.email ?? "",
      full_name: fullName.trim(),
      phone: phone.trim(),
      delivery_address: deliveryAddress.trim(),
      city: area === "outside" ? city.trim() || null : null,
      area: area as "beirut" | "outside",
      delivery_fee: deliveryFee,
      order_notes: orderNotes.trim() || null,
      items: orderItems,
      subtotal,
      total,
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlaceError(data.error ?? "We could not place that order. Please try again.")
        setPlacing(false)
        return
      }

      setOrderNumber(typeof data.order_number === "string" ? data.order_number : data.id)

      // Server-priced figures, falling back to the local ones only if the
      // response is somehow shaped differently than expected.
      const ownerPayload: OrderPayload = {
        full_name: fullName.trim(),
        user_email: user.email ?? "",
        phone: phone.trim(),
        area: area as "beirut" | "outside",
        city: area === "outside" ? city.trim() || null : null,
        delivery_address: deliveryAddress.trim(),
        order_notes: orderNotes.trim() || null,
        items: Array.isArray(data.items) ? data.items : orderItems,
        subtotal: typeof data.subtotal === "number" ? data.subtotal : subtotal,
        delivery_fee: typeof data.delivery_fee === "number" ? data.delivery_fee : deliveryFee,
        total: typeof data.total === "number" ? data.total : total,
      }
      const url = buildOwnerNotificationURL(ownerPayload)
      setOwnerUrl(url)
      // Opportunistic only. If the browser blocks it, the success screen's anchor
      // is the reliable path and the order is already saved either way.
      window.open(url, "_blank", "noopener")

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
                        key={`${item.product.id}::${item.selectedSize ?? "one"}`}
                        className="flex gap-4 border-b border-line p-5"
                      >
                        <div className="relative h-28 w-20 shrink-0 bg-paper-sunken">
                          {item.product.image_url && (
                            <Image
                              src={item.product.image_url}
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

                          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                            <div className="flex items-center border border-line">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.selectedSize,
                                    item.quantity - 1,
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
                              {pricePresentation(item.product).discountPercent}% event discount applied
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-faint transition-colors hover:text-signal-error"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash size={16} weight="light" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="shrink-0 border-t border-line p-5">
                  <fieldset>
                    <legend className="t-meta mb-3">Where are we delivering</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setArea("beirut")}
                        aria-pressed={area === "beirut"}
                        className={`border px-3 py-3 text-left transition-colors ${
                          area === "beirut"
                            ? "border-ink bg-ink text-paper"
                            : "border-line text-ink-dim hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        <span className="block text-[0.8125rem]">Beirut</span>
                        <span className="tnum t-meta block">$4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setArea("outside")}
                        aria-pressed={area === "outside"}
                        className={`border px-3 py-3 text-left transition-colors ${
                          area === "outside"
                            ? "border-ink bg-ink text-paper"
                            : "border-line text-ink-dim hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        <span className="block text-[0.8125rem]">Outside Beirut</span>
                        <span className="tnum t-meta block">$4</span>
                      </button>
                    </div>
                  </fieldset>

                  {area === "outside" && (
                    <div className="mt-3">
                      <label htmlFor="cart-city" className="t-meta mb-1.5 block">
                        Town or city
                      </label>
                      <input
                        id="cart-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Jounieh"
                        className="field"
                      />
                    </div>
                  )}

                  <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem]">
                    <div className="flex justify-between">
                      <dt className="text-ink-dim">Subtotal</dt>
                      <dd className="tnum text-ink">{money(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-dim">Delivery</dt>
                      <dd className="tnum text-ink">
                        {area === null ? "Pick an area" : money(deliveryFee)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-3">
                      <dt className="text-ink">Total</dt>
                      <dd className="tnum text-ink">
                        {area === null ? money(subtotal) : money(total)}
                      </dd>
                    </div>
                  </dl>

                  <button
                    onClick={startCheckout}
                    disabled={area === null}
                    className="btn btn-primary mt-5 w-full"
                  >
                    Continue to delivery details
                  </button>
                  {area === null && (
                    <p className="t-meta mt-2.5 text-center">
                      Choose a delivery area to continue
                    </p>
                  )}
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
                  <div>
                    <label htmlFor="ord-name" className="t-meta mb-1.5 block">
                      Full name
                    </label>
                    <input
                      id="ord-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nour Khalil"
                      className="field"
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label htmlFor="ord-phone" className="t-meta mb-1.5 block">
                      Phone
                    </label>
                    <input
                      id="ord-phone"
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03 456 789"
                      className="field tnum"
                      autoComplete="tel"
                    />
                    <p className="t-meta mt-1.5 normal-case tracking-normal">
                      The driver calls this number before arriving.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="ord-address" className="t-meta mb-1.5 block">
                      Delivery address
                    </label>
                    <textarea
                      id="ord-address"
                      required
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street, building, floor, and a landmark"
                      className="field resize-none"
                      autoComplete="street-address"
                    />
                  </div>

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
                    <dt className="text-ink-dim">
                      Delivery, {area === "beirut" ? "Beirut" : city.trim() || "outside Beirut"}
                    </dt>
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
                <button type="submit" disabled={placing} className="btn btn-primary w-full">
                  {placing ? "Placing order" : `Place order, ${money(total)}`}
                </button>
                <p className="t-meta mt-2.5 text-center normal-case tracking-normal">
                  We open WhatsApp so you can confirm with us directly.
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
                Send it to us on WhatsApp so we can check your sizes are in stock and
                agree a delivery time. Nothing is charged until the driver arrives.
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
                  <dd className="tnum text-ink">{money(total)}</dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-col gap-2">
                {ownerUrl && (
                  <>
                    <a
                      href={ownerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full"
                    >
                      Send the order on WhatsApp
                    </a>
                    <p className="t-meta mb-1 text-center normal-case tracking-normal">
                      If WhatsApp did not open on its own, tap above to send it.
                    </p>
                  </>
                )}
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
