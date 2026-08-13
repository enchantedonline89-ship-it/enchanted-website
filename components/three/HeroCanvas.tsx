"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { prefersReducedMotion, supportsWebGL } from "./capabilities"

const HeroSceneMount = dynamic(() => import("./HeroSceneMount"), { ssr: false })

export interface HeroCanvasProps {
  className?: string
  /** Dust motes; lower on constrained devices. Default 240. */
  dustCount?: number
  /** Master brightness/opacity multiplier, 0-1. Default 1. */
  intensity?: number
  /**
   * How `prefers-reduced-motion: reduce` is honoured:
   *  - "css-fallback" (default): skip WebGL entirely, show the static CSS
   *    treatment. Lightest: three.js is never downloaded for these users.
   *  - "static-frame": still load the scene, render exactly one frame with
   *    the real shading, then never schedule another.
   */
  reducedMotionMode?: "css-fallback" | "static-frame"
}

type Status = "checking" | "live" | "static" | "fallback"

/**
 * Public entry point for the hero's ambient WebGL layer (gold ring + gold
 * dust + silk sweep, one shared canvas/renderer). A `'use client'` leaf that
 * is safe to drop directly into `visual` on <Hero>: it renders nothing
 * blocking, decides capability client-side after mount, and only then lazy
 * loads the three.js engine chunk. The headline and CTA in Hero.tsx are
 * server-rendered and unaffected by anything in this file.
 *
 * Usage:
 *   import HeroCanvas from "@/components/three/HeroCanvas"
 *   <Hero visual={<HeroCanvas />} />
 */
export default function HeroCanvas({
  className,
  dustCount,
  intensity,
  reducedMotionMode = "css-fallback",
}: HeroCanvasProps) {
  const [status, setStatus] = useState<Status>("checking")

  useEffect(() => {
    function evaluate() {
      if (!supportsWebGL()) {
        setStatus("fallback")
        return
      }
      if (prefersReducedMotion()) {
        setStatus(reducedMotionMode === "static-frame" ? "static" : "fallback")
        return
      }
      setStatus("live")
    }

    evaluate()

    // Reduced-motion can change while the tab stays open (an OS setting
    // toggled mid-session); re-evaluate rather than freezing the first
    // decision for the life of the page.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    mq.addEventListener?.("change", evaluate)
    return () => mq.removeEventListener?.("change", evaluate)
  }, [reducedMotionMode])

  if (status === "checking") return null

  if (status === "fallback") {
    return <HeroFallback className={className} />
  }

  return (
    <HeroSceneMount
      key={status}
      className={className}
      dustCount={dustCount}
      intensity={intensity}
      staticFrame={status === "static"}
      onFail={() => setStatus("fallback")}
    />
  )
}

/**
 * Composed, not broken: reuses the brand's own mark at low opacity, in the
 * same corner the WebGL ring occupies, so a device with no WebGL (or a user
 * who asked for no motion, in "css-fallback" mode) still gets a considered
 * hero rather than an empty one. Same asset Hero.tsx already falls back to
 * when no `visual` is supplied at all.
 */
function HeroFallback({ className }: { className?: string }) {
  return (
    <div className={`gscn-fallback ${className ?? ""}`}>
      <div className="gscn-fallback-glow" />
      <div className="gscn-fallback-mark">
        <Image
          src="/brand/logo-mark.png"
          alt=""
          fill
          sizes="(max-width: 768px) 62vw, 32vw"
          className="object-contain"
        />
      </div>
    </div>
  )
}
