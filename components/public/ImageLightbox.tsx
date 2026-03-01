'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'

interface ImageLightboxProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  const prev = useCallback(() => {
    onNavigate(currentIndex === 0 ? images.length - 1 : currentIndex - 1)
  }, [currentIndex, images.length, onNavigate])

  const next = useCallback(() => {
    onNavigate(currentIndex === images.length - 1 ? 0 : currentIndex + 1)
  }, [currentIndex, images.length, onNavigate])

  // Focus the dialog on mount — rAF ensures the portal has painted before focus attempt
  useEffect(() => {
    const id = requestAnimationFrame(() => { dialogRef.current?.focus() })
    return () => cancelAnimationFrame(id)
  }, [])

  // Lock body scroll (useEffect never runs on the server; document access is safe here)
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowLeft') { prev(); return }
    if (e.key === 'ArrowRight') { next(); return }
    // Focus trap: keep Tab/Shift-Tab within the dialog
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
  }, [onClose, prev, next])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Product image lightbox"
      tabIndex={-1}
      className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center outline-none"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Image container — stop propagation so clicking image doesn't close */}
      <div
        className="relative w-full max-w-3xl max-h-[85vh] mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full h-[70vh]">
          <Image
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${images.length}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 75vw"
          />
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === currentIndex ? 'bg-[#c9a84c] w-4' : 'bg-white/30 hover:bg-white/60 w-2'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Next image"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all text-xl"
        aria-label="Close lightbox"
      >
        ×
      </button>
    </div>,
    document.body
  )
}
