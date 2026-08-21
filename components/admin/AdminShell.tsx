'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { List, SignOut } from '@phosphor-icons/react/ssr'
import { authClient } from '@/lib/auth/client'
import AdminSidebar from '@/components/admin/AdminSidebar'
import Logo from '@/components/public/Logo'

/**
 * The interactive chrome only. Authorization happens in the server layout that
 * renders this, so nothing here is load-bearing for access control.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-[100dvh] bg-paper">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-line bg-paper-raised px-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 items-center justify-center text-ink-dim transition-colors hover:text-ink"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <List size={20} weight="light" />
          </button>

          <Logo size="sm" />

          <button
            onClick={handleLogout}
            className="flex h-11 w-11 items-center justify-center text-ink-dim transition-colors hover:text-ink"
            aria-label="Sign out"
          >
            <SignOut size={18} weight="light" />
          </button>
        </header>

        <main id="main" className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
