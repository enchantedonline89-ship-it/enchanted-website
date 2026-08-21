'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  SquaresFour,
  Tag,
  Folders,
  Receipt,
  ChartLineUp,
  Percent,
  Palette,
  SignOut,
  X,
  ArrowSquareOut,
} from '@phosphor-icons/react/ssr'
import { authClient } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import { useOverlay } from '@/lib/use-overlay'
import Logo from '@/components/public/Logo'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', Icon: SquaresFour },
  { label: 'Products', href: '/admin/products', Icon: Tag },
  { label: 'Categories', href: '/admin/categories', Icon: Folders },
  { label: 'Orders', href: '/admin/orders', Icon: Receipt },
  { label: 'Analytics', href: '/admin/dashboard#analytics', Icon: ChartLineUp },
  { label: 'Events & discounts', href: '/admin/promotions', Icon: Percent },
  { label: 'Appearance', href: '/admin/settings', Icon: Palette },
]

interface AdminSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const sidebarRef = useOverlay<HTMLElement>(isOpen, () => onClose?.())

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      {isOpen && (
        <button
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={sidebarRef}
        tabIndex={isOpen ? -1 : undefined}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen || undefined}
        aria-label={isOpen ? 'Admin navigation' : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line bg-paper-raised transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]',
          'md:visible md:static md:z-auto md:shrink-0 md:translate-x-0 md:delay-0',
          isOpen ? 'visible translate-x-0 delay-0' : 'invisible -translate-x-full delay-300',
        )}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex flex-col gap-0.5">
            <Logo size="sm" />
            <p className="t-meta">Shop admin</p>
          </div>
          <button
            onClick={onClose}
            className="-mr-2 flex h-10 w-10 items-center justify-center text-ink-dim transition-colors hover:text-ink md:hidden"
            aria-label="Close menu"
          >
            <X size={18} weight="light" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin sections">
          <ul className="flex flex-col gap-0.5">
            {navItems.map(({ label, href, Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 px-3 py-2.5 text-[0.8125rem] transition-colors',
                      active
                        ? 'bg-ink text-paper'
                        : 'text-ink-dim hover:bg-ink/6 hover:text-ink',
                    )}
                  >
                    <Icon size={17} weight="light" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-[0.8125rem] text-ink-dim transition-colors hover:text-ink"
          >
            <ArrowSquareOut size={17} weight="light" />
            View the shop
          </Link>
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-[0.8125rem] text-ink-dim transition-colors hover:text-ink"
          >
            <SignOut size={17} weight="light" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
