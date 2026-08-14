"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { X, ArrowRight, ArrowLeft } from "@phosphor-icons/react/ssr"
import { useCart } from "@/lib/cart-context"
import { useOverlay } from "@/lib/use-overlay"

const STORAGE_KEY = "enchanted_welcome_seen"

const SLIDES = [
  {
    title: "Everything is in the catalog",
    body: "Six categories, all current stock. What you see is what we have, and sizes are listed on every piece.",
  },
  {
    title: "Pick a size, add to cart",
    body: "Sizes sit under each photo. Clothing runs in letters, shoes in EU numbers, accessories need no size.",
  },
  {
    title: "Tell us where to deliver",
    body: "Delivery is $4 anywhere in Lebanon. You give a name, a number and an address, nothing more.",
  },
  {
    title: "We confirm on WhatsApp",
    body: "Placing the order opens a chat with us. We reply to confirm stock and agree a delivery time with you.",
  },
  {
    title: "Pay the driver",
    body: "Cash on delivery, every time. There is no card form anywhere on this site.",
  },
]

/** localStorage throws in iOS private browsing, so every access is guarded. */
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode, the modal simply shows again next time */
  }
}

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)
  const pathname = usePathname()
  const { isOpen: cartOpen, items } = useCart()

  const dismiss = useCallback(() => {
    safeSet(STORAGE_KEY, "1")
    setOpen(false)
  }, [])

  useEffect(() => {
    function onWelcome() {
      if (pathname?.startsWith("/admin")) return
      if (safeGet(STORAGE_KEY)) return
      // Never interrupt a purchase. This fires on SIGNED_IN, and the most common
      // way to sign in is from the auth wall inside checkout, where a five slide
      // tutorial would land on top of the cart at the highest intent moment in
      // the product. Stay out of the way until the customer is browsing again.
      if (cartOpen || items.length > 0) return
      setSlide(0)
      setOpen(true)
    }
    window.addEventListener("enchanted:welcome", onWelcome)
    return () => window.removeEventListener("enchanted:welcome", onWelcome)
  }, [pathname, cartOpen, items.length])

  const dialogRef = useOverlay<HTMLDivElement>(open, dismiss)

  if (!open) return null

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={dismiss}
        className="absolute inset-0 bg-ink/45"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative w-full max-w-md border border-line bg-paper-raised"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="tnum t-meta">
            {slide + 1} of {SLIDES.length}
          </p>
          <button
            onClick={dismiss}
            className="flex h-10 w-10 items-center justify-center text-ink"
            aria-label="Close"
          >
            <X size={19} weight="light" />
          </button>
        </div>

        <div className="px-5 py-8">
          <h2 id="welcome-title" className="t-section text-ink">
            {current.title}
          </h2>
          <p className="t-body mt-4 text-[0.9375rem]">{current.body}</p>
        </div>

        <div className="flex items-center gap-2 border-t border-line p-5">
          {slide > 0 && (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="btn btn-ghost"
              aria-label="Previous"
            >
              <ArrowLeft size={14} weight="light" />
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? dismiss() : setSlide((s) => s + 1))}
            className="btn btn-primary flex-1"
          >
            {isLast ? "Start browsing" : "Next"}
            {!isLast && <ArrowRight size={14} weight="light" />}
          </button>
        </div>
      </div>
    </div>
  )
}
