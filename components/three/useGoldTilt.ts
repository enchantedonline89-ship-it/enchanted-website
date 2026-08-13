"use client"

import { useEffect, useRef, type RefObject } from "react"
import { prefersReducedMotion, supportsFineHover } from "./capabilities"

export interface UseGoldTiltOptions {
  /** Rotation at the pointer extremes, in degrees. Default 6: a sheen, not a gimbal. */
  maxTilt?: number
  /** Perspective distance for the 3D transform, in px. Default 900. */
  perspective?: number
  /** Peak rim-light opacity, 0-1. Default 0.4. */
  glow?: number
}

/**
 * Effect 4: pointer-driven tilt + gold rim light for one catalog tile. CSS
 * only, no WebGL, no `three` import anywhere in this module. The hook writes
 * a handful of CSS custom properties and toggles one class, throttled to at
 * most one write per animation frame; every visual rule (the transform, the
 * rim-light gradient, the transitions) lives in app/three.css against the
 * `.gtilt-tile` class.
 *
 * Attach the returned ref to the tile's own image/photo element (not the
 * whole card): that keeps interactive controls below the photo — size
 * chips, add-to-cart — perfectly flat and easy to hit, and matches "product
 * tile depth" rather than tilting the whole card.
 *
 * No-ops entirely (ref still returned, but no listeners attached, so the
 * custom properties stay at their zero defaults and the tile renders flat)
 * when the OS asks for reduced motion, or the device has no fine/hover
 * pointer (touch): a tilt-on-hover effect has no meaning on a finger.
 *
 * Usage:
 *   const tiltRef = useGoldTilt<HTMLButtonElement>()
 *   <button ref={tiltRef} className="media-zoom gtilt-tile relative block aspect-[3/4] w-full">
 */
export function useGoldTilt<T extends HTMLElement>(
  options: UseGoldTiltOptions = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  const { maxTilt = 6, perspective = 900, glow = 0.4 } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !supportsFineHover()) return

    el.style.setProperty("--gt-perspective", `${perspective}px`)

    let frame = 0
    let pendingX = 0
    let pendingY = 0
    let hasPending = false

    function flush() {
      frame = 0
      if (!hasPending || !el) return
      hasPending = false

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const nx = (pendingX - rect.left) / rect.width
      const ny = (pendingY - rect.top) / rect.height
      const rx = (0.5 - ny) * maxTilt
      const ry = (nx - 0.5) * maxTilt

      el.style.setProperty("--gt-rx", `${rx.toFixed(2)}deg`)
      el.style.setProperty("--gt-ry", `${ry.toFixed(2)}deg`)
      el.style.setProperty("--gt-mx", `${(nx * 100).toFixed(1)}%`)
      el.style.setProperty("--gt-my", `${(ny * 100).toFixed(1)}%`)
    }

    function onMove(e: PointerEvent) {
      pendingX = e.clientX
      pendingY = e.clientY
      hasPending = true
      if (!frame) frame = requestAnimationFrame(flush)
    }

    function onEnter() {
      el?.classList.add("gtilt-active")
      el?.style.setProperty("--gt-glow", String(glow))
    }

    function onLeave() {
      el?.classList.remove("gtilt-active")
      el?.style.setProperty("--gt-rx", "0deg")
      el?.style.setProperty("--gt-ry", "0deg")
      el?.style.setProperty("--gt-glow", "0")
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    el.addEventListener("pointerenter", onEnter)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)

    return () => {
      el.removeEventListener("pointerenter", onEnter)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [maxTilt, perspective, glow])

  return ref
}
