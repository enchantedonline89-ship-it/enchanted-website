'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Slide icons (inline SVG, stroke/fill as specified) ───────────────────────

const GridIcon = () => (
  <svg className="w-9 h-9 text-gold mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
)

const BagIcon = () => (
  <svg className="w-9 h-9 text-gold mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg className="w-9 h-9 mb-4" viewBox="0 0 24 24" style={{ fill: '#25D366' }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const ReceiptIcon = () => (
  <svg className="w-9 h-9 text-gold mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)
  const [slideDir, setSlideDir] = useState<1 | -1>(1)

  const LAST = 4

  // Listen for the enchanted:welcome custom event
  useEffect(() => {
    const handleWelcome = () => {
      try { if (localStorage.getItem('enchanted_welcome_seen')) return } catch { /* iOS private browsing */ }
      setOpen(true)
      // Slight delay so the card entrance animation fires after mount
      requestAnimationFrame(() => requestAnimationFrame(() => setCardVisible(true)))
    }
    window.addEventListener('enchanted:welcome', handleWelcome)
    return () => window.removeEventListener('enchanted:welcome', handleWelcome)
  }, [])

  const handleClose = useCallback(() => {
    try { localStorage.setItem('enchanted_welcome_seen', 'true') } catch { /* iOS private browsing */ }
    setCardVisible(false)
    setTimeout(() => {
      setOpen(false)
      setCurrent(0)
    }, 250)
  }, [])

  const navigate = useCallback((dir: 1 | -1) => {
    setSlideDir(dir)
    setFading(true)
    setTimeout(() => {
      setCurrent(prev => prev + dir)
      setFading(false)
    }, 180)
  }, [])

  if (!open) return null

  // ─── Slide definitions (defined inside component so handleClose is in scope)
  const slides = [
    // Slide 1 — Welcome
    {
      icon: <span className="text-[2.5rem] leading-none mb-4 block">✨</span>,
      headline: 'Welcome to Enchanted Style',
      body: 'Your destination for Lebanese fashion. Browse our collections, choose your favorites, and order directly through WhatsApp — all in one place.',
      highlight: null,
      cta: 'Let me show you around →',
    },
    // Slide 2 — Browse & Filter
    {
      icon: <GridIcon />,
      headline: 'Browse our collections',
      body: 'Use the category tabs on the homepage to filter by collection — Dresses, Tops, Accessories, and more. Tap any product to see all available photos and sizes.',
      highlight: (
        <span className="inline-block bg-gold/10 text-gold text-xs px-3 py-1 rounded-full mb-2">
          ↑ Category filters are just below the hero section
        </span>
      ),
      cta: 'Next →',
    },
    // Slide 3 — Add to Cart & Order
    {
      icon: <BagIcon />,
      headline: 'Pick your size and add to cart',
      body: 'Select your size on any product card, then tap Add to Cart. When you\'re ready, open your cart — tap the bag icon in the top right — and fill in your delivery details.',
      highlight: (
        <span className="inline-block bg-surface border border-border text-muted text-xs px-3 py-1.5 rounded-lg mb-2">
          🛒 Your cart is saved automatically — even if you close the browser.
        </span>
      ),
      cta: 'Next →',
    },
    // Slide 4 — WhatsApp Ordering
    {
      icon: <WhatsAppIcon />,
      headline: 'We confirm every order on WhatsApp',
      body: "After placing your order, you'll be redirected to WhatsApp to send a confirmation message to us. We'll reply within the hour to confirm your delivery details.",
      highlight: (
        <span className="inline-block bg-surface border border-border text-muted text-xs px-3 py-1.5 rounded-lg mb-2">
          💵 We only accept Cash on Delivery — pay when your order arrives.
        </span>
      ),
      cta: 'Next →',
    },
    // Slide 5 — Track Your Orders
    {
      icon: <ReceiptIcon />,
      headline: 'Track all your orders',
      body: 'Every order you place is saved to your account. You can view your order history anytime from your account menu (the circle with your initial in the top right).',
      highlight: (
        <a
          href="/orders"
          onClick={handleClose}
          className="inline-block text-gold text-sm underline underline-offset-2 hover:text-gold/80 transition-colors mb-2"
        >
          View My Orders →
        </a>
      ),
      cta: 'Start Shopping →',
    },
  ]

  const slide = slides[current]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[90]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Card container */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl pointer-events-auto relative transition-all duration-300"
          style={{
            opacity: cardVisible ? 1 : 0,
            transform: cardVisible ? 'scale(1)' : 'scale(0.95)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button — 44×44px tap target */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-subtle hover:text-foreground transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-5 pb-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full bg-gold transition-all duration-300 ${
                  i === current ? 'w-6' : 'w-2 opacity-20'
                }`}
              />
            ))}
          </div>

          {/* Slide content */}
          <div
            className="px-6 py-5 min-h-[260px] flex flex-col items-center text-center"
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? `translateX(${slideDir * -10}px)` : 'translateX(0)',
              transition: 'opacity 180ms ease, transform 180ms ease',
            }}
          >
            {slide.icon}
            <h2
              id="welcome-modal-title"
              className="font-display text-xl text-foreground font-semibold mb-2"
            >
              {slide.headline}
            </h2>
            <p className="text-sm text-muted leading-relaxed mb-4">
              {slide.body}
            </p>
            {slide.highlight}
          </div>

          {/* Navigation row */}
          <div className="px-6 pb-6 flex items-center justify-between">
            {current > 0 ? (
              <button
                onClick={() => navigate(-1)}
                className="text-subtle text-sm hover:text-muted transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={current === LAST ? handleClose : () => navigate(1)}
              className="bg-gold hover:bg-gold/90 text-black text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {slide.cta}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
