/**
 * Shared, side-effect-free feature detection used by both the hero WebGL
 * scene (HeroCanvas) and the CSS-only tile tilt (useGoldTilt). Plain
 * functions, not a hook: safe to call from anywhere on the client, and safe
 * to import from a server module since every check is guarded for the
 * absence of `window`.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** True on devices with a real pointer that can hover (mouse/trackpad). False on touch. */
export function supportsFineHover(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

/**
 * Feature-detects WebGL without leaving a context behind. Used to decide
 * whether it is worth lazy-loading the three.js chunk at all; the probe
 * context is discarded and explicitly released.
 */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    if (!gl) return false
    const loseCtx = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")
    loseCtx?.loseContext()
    return true
  } catch {
    return false
  }
}
