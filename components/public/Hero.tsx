'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  // ─── Three.js scene ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    // HDR-like tone mapping makes the gems glow with intensity
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.8

    // ── Materials — emissive glow so gems shine even in shadow ──────────────
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a843,
      emissive: 0xb87c1a,        // warm gold inner glow
      emissiveIntensity: 0.6,
      metalness: 1.0,
      roughness: 0.05,
    })
    const brightGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xd4a020,        // vivid yellow-gold flash
      emissiveIntensity: 0.9,
      metalness: 1.0,
      roughness: 0.0,
    })
    const roseGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8956d,
      emissive: 0xc04a1a,        // deep rose pulse
      emissiveIntensity: 0.5,
      metalness: 0.95,
      roughness: 0.08,
    })

    // ── Geometry ─────────────────────────────────────────────────────────────
    const geometries = [
      new THREE.OctahedronGeometry(0.28),
      new THREE.IcosahedronGeometry(0.22),
      new THREE.TetrahedronGeometry(0.26),
    ]
    const materials = [goldMaterial, brightGoldMaterial, roseGoldMaterial]

    const shapes: THREE.Mesh[] = []
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(geometries[i % 3], materials[i % 3])
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.5) * 4 - 1
      )
      mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
      scene.add(mesh)
      shapes.push(mesh)
    }

    // ── Lights — much brighter to make the gems sparkle ───────────────────
    // Ambient — warm golden fill
    scene.add(new THREE.AmbientLight(0xffe0a0, 1.2))

    // Key light — strong warm front light
    const keyLight = new THREE.DirectionalLight(0xfff0cc, 6)
    keyLight.position.set(3, 5, 4)
    scene.add(keyLight)

    // Fill light — cool side contrast
    const fillLight = new THREE.DirectionalLight(0xadd8ff, 2.5)
    fillLight.position.set(-5, 0, 3)
    scene.add(fillLight)

    // Rim light — backlit edge sparkle
    const rimLight = new THREE.DirectionalLight(0xffd700, 4)
    rimLight.position.set(0, -4, -3)
    scene.add(rimLight)

    // Point lights — orbiting hot spots
    const pointLight1 = new THREE.PointLight(0xffc940, 8, 18)
    pointLight1.position.set(-4, 4, 3)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffee88, 6, 14)
    pointLight2.position.set(5, -2, 2)
    scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight(0xff9900, 4, 12)
    pointLight3.position.set(0, 0, 4)
    scene.add(pointLight3)

    // ── Mouse ─────────────────────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // ── Animation loop ────────────────────────────────────────────────────
    let animationId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      shapes.forEach((shape, i) => {
        shape.rotation.x += 0.004 + i * 0.0002
        shape.rotation.y += 0.005 + i * 0.00015
        shape.position.y += Math.sin(elapsed * 0.5 + i * 0.9) * 0.0012

        // Pulse emissive intensity so gems flicker like real gems catching light
        const mat = shape.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = mat.emissiveIntensity * 0.97 +
          (0.4 + Math.sin(elapsed * 1.2 + i * 1.7) * 0.4) * 0.03
      })

      // Orbit point lights slowly for dynamic reflections
      pointLight1.position.x = Math.sin(elapsed * 0.3) * 5
      pointLight1.position.z = Math.cos(elapsed * 0.3) * 4
      pointLight2.position.x = Math.cos(elapsed * 0.2) * 5
      pointLight2.position.y = Math.sin(elapsed * 0.4) * 3

      camera.position.x += (mouseRef.current.x * 0.6 - camera.position.x) * 0.04
      camera.position.y += (mouseRef.current.y * 0.4 - camera.position.y) * 0.04
      camera.lookAt(scene.position)

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ────────────────────────────────────────────────────────────
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      geometries.forEach(g => g.dispose())
    }
  }, [])

  // ─── GSAP hero text reveal — cinematic stagger ────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.5 })

    // Eyebrow line — fades in from below with slight scale
    tl.from('.hero-eyebrow', {
      opacity: 0,
      y: 30,
      letterSpacing: '0.2em',
      duration: 0.9,
      ease: 'power3.out',
    })

    // "Enchanted" — large dramatic upward sweep
    .from('.hero-title-main', {
      opacity: 0,
      y: 80,
      skewX: 4,
      duration: 1.1,
      ease: 'power4.out',
    }, '-=0.4')

    // "Style" — italic gold word with scale punch
    .from('.hero-title-accent', {
      opacity: 0,
      y: 60,
      scale: 0.85,
      duration: 1.0,
      ease: 'power4.out',
    }, '-=0.7')

    // Subtitle — soft fade up
    .from('.hero-subtitle', {
      opacity: 0,
      y: 28,
      duration: 0.8,
      ease: 'power2.out',
    }, '-=0.5')

    // CTA button — rises up with a subtle scale pop
    .from('.hero-cta', {
      opacity: 0,
      y: 24,
      scale: 0.94,
      duration: 0.7,
      ease: 'back.out(1.4)',
    }, '-=0.4')
  }, [])

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Three.js canvas */}
      <canvas ref={canvasRef} className="hero-canvas" />

      {/* Gradient overlay — lighter than before so gems show through more */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,10,0.05) 0%, transparent 35%, rgba(10,10,10,0.75) 100%)',
        }}
      />

      {/* Hero content */}
      <div className="relative z-[2] text-center px-4 max-w-4xl mx-auto select-none">

        {/* Eyebrow */}
        <p className="hero-eyebrow inline-block text-[#c9a84c] text-xs tracking-[0.45em] uppercase mb-8 font-semibold">
          Lebanon&apos;s Premier Fashion Destination
        </p>

        {/* Main title */}
        <h1 className="font-display leading-[0.88] mb-8">
          <span className="hero-title-main block text-7xl sm:text-8xl lg:text-9xl xl:text-[10rem] text-white drop-shadow-[0_0_60px_rgba(201,168,76,0.25)]">
            Enchanted
          </span>
          <span
            className="hero-title-accent block text-7xl sm:text-8xl lg:text-9xl xl:text-[10rem] italic"
            style={{
              background: 'linear-gradient(135deg, #c9a84c 0%, #ffe066 40%, #f0d060 60%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(255,224,102,0.5))',
            }}
          >
            Style
          </span>
        </h1>

        {/* Subtitle — brighter so it's more readable */}
        <p className="hero-subtitle text-white/75 text-lg lg:text-xl max-w-md mx-auto mb-12 leading-relaxed font-light">
          Where glamour meets edge. Curated women&apos;s fashion crafted to make every moment unforgettable.
        </p>

        {/* CTA */}
        <a
          href="#catalog"
          data-hover
          className="hero-cta inline-flex items-center gap-3 text-[#0a0a0a] text-sm uppercase tracking-[0.2em] font-bold px-12 py-4 rounded-full transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #ffe066, #f0d060)',
            boxShadow: '0 0 30px rgba(201,168,76,0.35), 0 0 60px rgba(201,168,76,0.15)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.boxShadow = '0 0 50px rgba(255,224,102,0.6), 0 0 100px rgba(201,168,76,0.3)'
            el.style.transform = 'scale(1.06)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.boxShadow = '0 0 30px rgba(201,168,76,0.35), 0 0 60px rgba(201,168,76,0.15)'
            el.style.transform = 'scale(1)'
          }}
        >
          Explore Collection
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2">
        <span className="text-white/35 text-[10px] tracking-[0.35em] uppercase">Scroll</span>
        <div className="w-px h-10 overflow-hidden relative">
          <div
            className="absolute inset-x-0 top-0 h-full"
            style={{
              background: 'linear-gradient(to bottom, #c9a84c, transparent)',
              animation: 'scrollLine 1.8s ease-in-out infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes scrollLine {
            0%   { transform: translateY(-100%); opacity: 1; }
            100% { transform: translateY(100%);  opacity: 0; }
          }
        `}</style>
      </div>
    </section>
  )
}
