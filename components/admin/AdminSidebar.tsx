'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '⬡' },
  { label: 'Products', href: '/admin/products', icon: '◈' },
  { label: 'Categories', href: '/admin/categories', icon: '◉' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <img src="/logo.png" alt="Enchanted Style" className="h-8 w-auto object-contain" />
        <p className="text-muted text-xs mt-1 tracking-widest uppercase">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'admin-nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
              pathname.startsWith(item.href)
                ? 'active bg-gold/10 text-gold border-l-2 border-gold'
                : 'text-muted hover:bg-foreground/5 hover:text-foreground border-l-2 border-transparent'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span>↪</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
