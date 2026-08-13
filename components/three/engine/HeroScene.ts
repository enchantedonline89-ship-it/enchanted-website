import { PerspectiveCamera, Scene, WebGLRenderer } from "three"
import { createGoldDust, type GoldDustHandle } from "./goldDust"

export interface HeroSceneOptions {
  dustCount?: number
  /** Master brightness/opacity multiplier, 0-1. */
  intensity?: number
  /** DPR ceiling. Default 1.75: a deliberately tighter cap than the usual 2, for the 4x-CPU-throttle mobile budget this scene is built to. */
  maxPixelRatio?: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

/**
 * Owns one WebGLRenderer/Scene/Camera for all three ambient hero effects
 * so the hero never opens more than one WebGL context.
 * Framework-free: HeroSceneMount drives this from React lifecycle effects,
 * nothing in here imports React.
 */
export class HeroScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(36, 1, 0.1, 30)
  private dust: GoldDustHandle

  private maxPixelRatio: number

  private elapsed = 0
  private lastTime = 0
  private rafId: number | null = null
  private running = false

  constructor(canvas: HTMLCanvasElement, opts: HeroSceneOptions = {}) {
    this.maxPixelRatio = opts.maxPixelRatio ?? 1.75

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      stencil: false,
      powerPreference: "high-performance",
    })
    this.renderer.setClearColor(0x000000, 0)

    this.camera.position.set(0, 0, 8)

    this.dust = createGoldDust({ count: opts.dustCount ?? 520 })

    // (Transparent objects are still depth-sorted by three.js each frame;
    // this add order just matches the intended default sort.)
    this.scene.add(this.dust.points)

    if (opts.intensity != null) this.setIntensity(opts.intensity)
  }

  setIntensity(v: number): void {
    const clamped = clamp(v, 0, 1)
    this.dust.setOpacity(0.55 * clamped)
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return

    const pr = clamp(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1, this.maxPixelRatio)
    this.renderer.setPixelRatio(pr)
    this.renderer.setSize(width, height, false)
    this.dust.setPixelRatio(pr)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    const vFov = (this.camera.fov * Math.PI) / 180


  }

  /**
   * The ring sits at object z = 0. Its scale and X position are derived from
   * the frustum at that depth (not fixed world units), so it reads at a
   * sensible size and stays on screen across both an ultrawide desktop hero
   * and a narrow phone portrait, instead of a fixed offset that only looks
   * right on the aspect ratio it was tuned against.
   */

  /** Renders exactly one frame at time zero and schedules nothing further: the reduced-motion "static frame" path. */
  renderStatic(): void {
    this.dust.update(0)
    this.renderer.render(this.scene, this.camera)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private loop = (now: number): void => {
    if (!this.running) return
    const dt = clamp((now - this.lastTime) / 1000, 0, 0.1)
    this.lastTime = now
    this.elapsed += dt

    this.dust.update(this.elapsed)

    this.renderer.render(this.scene, this.camera)
    this.rafId = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    this.stop()
    this.dust.dispose()
    this.renderer.dispose()
  }
}
