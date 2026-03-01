'use client'

import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Mount flag — avoids SSR mismatch and Rules of Hooks violation
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let dotX = 0
    let dotY = 0
    let ringX = 0
    let ringY = 0
    let mouseX = 0
    let mouseY = 0
    let rafId: number

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const animate = () => {
      // Dot follows immediately
      dotX = mouseX
      dotY = mouseY

      // Ring follows with lag
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12

      dot.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`
      ring.style.transform = `translate(${ringX - 16}px, ${ringY - 16}px)`

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    window.addEventListener('mousemove', onMouseMove)

    // Handle hover states for elements with data-hover attribute
    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-hover]')) {
        dot.classList.add('hovered')
        ring.classList.add('hovered')
      }
    }

    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-hover]')) {
        dot.classList.remove('hovered')
        ring.classList.remove('hovered')
      }
    }

    document.addEventListener('mouseover', handleMouseEnter)
    document.addEventListener('mouseout', handleMouseLeave)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', handleMouseEnter)
      document.removeEventListener('mouseout', handleMouseLeave)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}
