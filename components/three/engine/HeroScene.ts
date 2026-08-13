import { PerspectiveCamera, Scene, WebGLRenderer } from "three"
import { createGoldDust, type GoldDustHandle } from "./goldDust"
import { createGoldAccents, type GoldAccentsHandle } from "./goldAccents"

export interface HeroSceneOptions {
  dustCount?: number
  /** Master brightness/opacity multiplier, 0-1. */
  intensity?: number
  /** DPR ceiling. Defaults to 1.25 on coarse pointers and 1.5 elsewhere. */
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
  private accents: GoldAccentsHandle

  private maxPixelRatio: number
  private width = 0
  private height = 0
  private pixelRatio = 0

  private elapsed = 0
  private lastTime = 0
  private rafId: number | null = null
  private running = false

  constructor(canvas: HTMLCanvasElement, opts: HeroSceneOptions = {}) {
    const constrained = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    this.maxPixelRatio = opts.maxPixelRatio ?? (constrained ? 1.25 : 1.5)

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !constrained,
      stencil: false,
      powerPreference: "high-performance",
    })
    this.renderer.setClearColor(0x000000, 0)

    this.camera.position.set(0, 0, 8)

    this.dust = createGoldDust({ count: opts.dustCount ?? 240 })
    this.accents = createGoldAccents()

    // (Transparent objects are still depth-sorted by three.js each frame;
    // this add order just matches the intended default sort.)
    this.scene.add(this.accents.silk, this.dust.points, this.accents.ring)

    if (opts.intensity != null) this.setIntensity(opts.intensity)
  }

  setIntensity(v: number): void {
    const clamped = clamp(v, 0, 1)
    this.dust.setOpacity(0.55 * clamped)
    this.accents.setIntensity(clamped)
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return

    const pr = clamp(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1, this.maxPixelRatio)
    if (pr !== this.pixelRatio) {
      this.pixelRatio = pr
      this.renderer.setPixelRatio(pr)
      this.dust.setPixelRatio(pr)
    }
    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.renderer.setSize(width, height, false)
    }

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    const viewHeight = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z
    this.accents.layout(this.camera.aspect, viewHeight)

  }

  /** Renders exactly one frame at time zero and schedules nothing further: the reduced-motion "static frame" path. */
  renderStatic(): void {
    this.dust.update(0)
    this.accents.update(0)
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
    this.accents.update(this.elapsed)

    this.renderer.render(this.scene, this.camera)
    this.rafId = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    this.stop()
    this.dust.dispose()
    this.accents.dispose()
    this.renderer.dispose()
  }
}
