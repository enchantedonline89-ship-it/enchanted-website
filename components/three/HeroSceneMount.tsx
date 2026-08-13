"use client"

import { useEffect, useRef } from "react"
import { HeroScene } from "./engine/HeroScene"

export interface HeroSceneMountProps {
  dustCount?: number
  intensity?: number
  /** Render one frame and never start the loop. Still real WebGL shading, just frozen. */
  staticFrame?: boolean
  className?: string
  /** Called if the renderer fails to construct even after HeroCanvas's own WebGL probe passed (rare: driver blocklists, resource exhaustion). Lets the parent fall back to the CSS treatment instead of leaving a blank layer. */
  onFail?: () => void
}

/**
 * The heavy half of the hero visual. Reached only through HeroCanvas's
 * `next/dynamic(..., { ssr: false })` import, so `three` never ships in the
 * initial bundle and never runs on the server. Owns the canvas element and
 * the full engine lifecycle: mount, resize, visibility pause, context-loss
 * handling, teardown.
 *
 * Deliberately ignores prop changes after mount (see the empty effect
 * dependency array below) rather than tearing down and rebuilding the WebGL
 * context on every re-render; this component's props are meant to be set
 * once at the call site, not driven by frequently-changing state.
 */
export default function HeroSceneMount({
  dustCount,
  intensity,
  staticFrame = false,
  className,
  onFail,
}: HeroSceneMountProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let engine: HeroScene | null = null
    let intersecting = false
    let disposed = false

    try {
      engine = new HeroScene(canvas, { dustCount, intensity })
    } catch {
      onFail?.()
      return
    }

    function applyRunState() {
      if (disposed || !engine) return
      if (staticFrame) {
        engine.stop()
        return
      }
      if (intersecting && !document.hidden) {
        engine.start()
      } else {
        engine.stop()
      }
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !engine) return
      const { width, height } = entry.contentRect
      engine.resize(Math.round(width), Math.round(height))
      if (staticFrame) engine.renderStatic()
    })
    ro.observe(container)

    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry?.isIntersecting ?? false
        applyRunState()
      },
      { threshold: 0.01 },
    )
    io.observe(container)

    function onVisibility() {
      applyRunState()
    }
    document.addEventListener("visibilitychange", onVisibility)

    function onContextLost(event: Event) {
      event.preventDefault()
      engine?.stop()
    }
    canvas.addEventListener("webglcontextlost", onContextLost)

    // First paint: do not wait on the ResizeObserver's own initial callback
    // so the very first frame is not empty.
    const rect = container.getBoundingClientRect()
    engine.resize(Math.round(rect.width), Math.round(rect.height))
    if (staticFrame) {
      engine.renderStatic()
    } else {
      applyRunState()
    }

    return () => {
      disposed = true
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      engine?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className={`gscn-layer ${className ?? ""}`}>
      <canvas ref={canvasRef} className="gscn-canvas" />
    </div>
  )
}
