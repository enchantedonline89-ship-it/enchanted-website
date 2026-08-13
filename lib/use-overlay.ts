"use client"

import { useEffect, useRef } from "react"

/**
 * Shared behaviour for every overlay surface: the cart drawer, the mobile menu,
 * the auth panel, the lightbox, and both modals.
 *
 * It exists because each of those had hand-rolled the same three things slightly
 * differently, and the differences were bugs:
 *
 *  - Escape was bound to `window` by every open overlay at once, so a single press
 *    with the auth panel over the cart closed BOTH and threw the customer out of
 *    checkout entirely. Only the topmost overlay may consume the key.
 *  - Each surface set and cleared `document.body.style.overflow` independently, so
 *    closing the upper of two stacked overlays unlocked scrolling behind the one
 *    still open. The lock is now reference counted.
 *  - Every surface declared `aria-modal="true"` while leaving 70 to 90 elements
 *    behind it in the tab order, and none moved focus in or returned it on close.
 *    That is a false promise to assistive tech and the largest a11y defect here.
 *
 * Returns a ref to attach to the dialog element.
 */

const stack: symbol[] = []
let lockCount = 0

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

export function useOverlay<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null)
  const idRef = useRef<symbol | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Kept in a ref so a new inline closure on every render does not tear the
  // listener down and rebuild it, which would lose the stack position.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const id = Symbol("overlay")
    idRef.current = id
    stack.push(id)

    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    lockCount += 1
    document.body.style.overflow = "hidden"

    const visibleFocusables = () => {
      const node = ref.current
      if (!node) return [] as HTMLElement[]
      return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
    }

    // Move focus in, so a keyboard or screen reader user starts inside the dialog
    // rather than at the top of a page the dialog claims is unavailable.
    const raf = window.requestAnimationFrame(() => {
      const first = visibleFocusables()[0]
      if (first) first.focus()
      else ref.current?.focus?.()
    })

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return

      if (e.key === "Escape") {
        e.stopPropagation()
        e.preventDefault()
        onCloseRef.current()
        return
      }

      if (e.key !== "Tab") return

      const els = visibleFocusables()
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !ref.current?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKey, true)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("keydown", onKey, true)

      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)

      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) document.body.style.overflow = ""

      const trigger = triggerRef.current
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [open])

  return ref
}
