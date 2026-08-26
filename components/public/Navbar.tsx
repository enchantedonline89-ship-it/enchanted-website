"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { List, X, Bag, User as UserIcon } from "@phosphor-icons/react/ssr"
import Logo from "./Logo"
import AuthModal from "./AuthModal"
import { useCart } from "@/lib/cart-context"
import { useOverlay } from "@/lib/use-overlay"
import { useAuth } from "@/lib/auth-context"

const LINKS = [
  { href: "/#catalog", label: "Shop All" },
  { href: "/size-guide", label: "Sizes" },
  { href: "/track-order", label: "Track order" },
  { href: "/contact", label: "Contact" },
]

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { totalItems, openCart } = useCart()
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const syncAuthRequest = () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get('auth') === '1') setAuthOpen(true)
    }
    syncAuthRequest()
    window.addEventListener('popstate', syncAuthRequest)
    return () => window.removeEventListener('popstate', syncAuthRequest)
  }, [pathname])

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') !== '1') return
    const target = params.get('returnTo')
    router.replace(target?.startsWith('/') && !target.startsWith('//') ? target : '/')
  }, [user, router])

  function closeAuth() {
    setAuthOpen(false)
    const url = new URL(window.location.href)
    if (url.searchParams.get('auth') !== '1') return
    url.searchParams.delete('auth')
    url.searchParams.delete('returnTo')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  // Close the drawer when the route changes, adjusted during render rather than
  // in an effect so navigation does not cost an extra commit.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  const drawerRef = useOverlay<HTMLDivElement>(drawerOpen, () => setDrawerOpen(false))

  return (
    <>
      {/* Flat fill, no backdrop-filter. A blurred backdrop on a fixed sitewide header
          has to resample and reblur whatever scrolls under it every frame, which is the
          one effect here capable of dropping frames on a mid-range Android. It was also
          the only glass in the codebase, which DESIGN.md bans as decoration. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/95">
        <nav
          className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 lg:px-10"
          aria-label="Main"
        >
          <Logo />

          {/* Desktop. One line, always. */}
          <ul className="hidden items-center gap-9 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="t-meta link-grow text-ink-dim hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            {loading ? (
              <div className="hidden h-9 w-28 lg:block" aria-hidden="true" />
            ) : user ? (
              <div className="hidden items-center gap-1 lg:flex">
                <Link
                  href="/orders"
                  className="t-meta link-grow px-3 py-2 text-ink-dim hover:text-ink"
                >
                  Orders
                </Link>
                <Link
                  href="/account/addresses"
                  className="t-meta link-grow px-3 py-2 text-ink-dim hover:text-ink"
                >
                  Account
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="t-meta link-grow px-3 py-2 text-ink-dim hover:text-ink"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="t-meta px-3 py-2 text-ink-faint transition-colors hover:text-ink"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="hidden items-center gap-2 px-3 py-2 lg:flex"
                aria-label="Sign in"
              >
                <UserIcon size={18} weight="light" className="text-ink-dim" />
                <span className="t-meta text-ink-dim">Sign in</span>
              </button>
            )}

            <button
              onClick={openCart}
              className="relative flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
              aria-label={`Open cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
            >
              <Bag size={21} weight="light" />
              {totalItems > 0 && (
                <span className="tnum absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center bg-ink px-1 text-[0.625rem] font-semibold text-paper">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 items-center justify-center text-ink lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <List size={22} weight="light" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        inert={!drawerOpen}
      >
        <button
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-line bg-paper-raised transition-transform duration-400 ease-[cubic-bezier(.16,1,.3,1)] ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5">
            <Logo size="sm" />
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center text-ink"
              aria-label="Close menu"
            >
              <X size={20} weight="light" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-8" aria-label="Mobile">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.href} className="border-b border-line">
                  <Link
                    href={link.href}
                    onClick={(event) => {
                      // Closing makes the drawer inert; navigate explicitly so
                      // the browser cannot lose a same-page hash activation.
                      event.preventDefault()
                      router.push(link.href)
                      setDrawerOpen(false)
                    }}
                    className="block py-5 text-2xl tracking-tight text-ink"
                    style={{ fontVariationSettings: '"wdth" 108, "wght" 500' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-1">
              {user ? (
                <>
                  <p className="t-meta mb-3 truncate">{user.email}</p>
                  <Link href="/orders" className="t-meta py-3 text-ink-dim">
                    Your orders
                  </Link>
                  <Link href="/account/addresses" className="t-meta py-3 text-ink-dim">
                    Account & addresses
                  </Link>
                  {isAdmin && (
                    <Link href="/admin/dashboard" className="t-meta py-3 text-ink-dim">
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="t-meta py-3 text-left text-ink-faint"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setDrawerOpen(false)
                    setAuthOpen(true)
                  }}
                  className="btn btn-ghost w-full"
                >
                  Sign in
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={closeAuth} />
    </>
  )
}
