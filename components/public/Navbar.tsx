'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { WHATSAPP_FLOAT_URL } from '@/lib/whatsapp'
import Logo from '@/components/public/Logo'

const NAV_LINKS = [
  { label: 'Collections', href: '#catalog' },
  { label: 'New Arrivals', href: '#new' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { totalItems, openCart } = useCart()
  const { user, signOut } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled ? 'nav-glass' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-20">
          {/* LEFT: Logo */}
          <a href="/" className="flex-shrink-0" data-hover>
            <Logo className="h-9 w-auto" />
          </a>

          {/* CENTER: Nav links (desktop only) */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                data-hover
                className="text-sm tracking-widest uppercase text-muted hover:text-[#c9a84c] transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </div>

          {/* RIGHT: WhatsApp + Cart + Hamburger */}
          <div className="flex items-center gap-3">
            {/* WhatsApp CTA (desktop) */}
            <a
              href={WHATSAPP_FLOAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              className="hidden sm:inline-flex items-center gap-2 border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded-full transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp
            </a>

            {/* Auth UI */}
            {user ? (
              <div className="relative group hidden sm:block pb-2">
                <button
                  className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold text-xs font-semibold hover:bg-gold/30 transition-colors"
                  aria-label="Account menu"
                  data-hover
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{(user.user_metadata?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}</span>
                  )}
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-10 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
                  {user.email?.toLowerCase() === 'enchantedonline89@gmail.com' && (
                    <a href="/admin/dashboard" className="block px-4 py-3 text-sm text-gold hover:bg-gold/5 transition-colors border-b border-border">
                      Admin Panel
                    </a>
                  )}
                  <a href="/orders" className="block px-4 py-3 text-sm text-foreground hover:text-gold hover:bg-foreground/5 transition-colors">
                    My Orders
                  </a>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-3 text-sm text-muted hover:text-red-500 hover:bg-red-50 transition-colors border-t border-border"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openCart}
                className="hidden sm:block text-muted hover:text-foreground text-xs uppercase tracking-widest transition-colors"
                data-hover
              >
                Sign In
              </button>
            )}

            {/* Cart icon */}
            <button
              onClick={openCart}
              className="relative text-muted hover:text-[#c9a84c] transition-colors p-1"
              aria-label={`Open cart (${totalItems} items)`}
              data-hover
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c9a84c] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-muted hover:text-foreground transition-colors p-1"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
              data-hover
            >
              {menuOpen ? (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/30 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile menu drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 z-[56] bg-surface border-l border-border flex flex-col pt-20 pb-8 px-6 transition-transform duration-300 ease-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <nav className="flex flex-col gap-6 flex-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={closeMenu}
              data-hover
              className="text-muted hover:text-[#c9a84c] text-sm uppercase tracking-[0.3em] transition-colors duration-200 font-medium"
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href={WHATSAPP_FLOAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMenu}
          data-hover
          className="flex items-center justify-center gap-2 bg-[#c9a84c] hover:bg-[#f0d060] text-black text-xs uppercase tracking-widest font-semibold py-3 rounded-lg transition-all duration-200"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Chat on WhatsApp
        </a>
      </div>
    </>
  )
}
