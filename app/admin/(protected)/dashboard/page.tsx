import { createClient } from '@/lib/supabase/server'
import AuditLogTable from '@/components/admin/AuditLogTable'
import { DashboardStats, AdminLog } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: featuredProducts },
    { count: totalCategories },
    { count: totalLogs },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('admin_logs').select('*', { count: 'exact', head: true }),
    supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const stats: DashboardStats = {
    total_products: totalProducts ?? 0,
    active_products: activeProducts ?? 0,
    featured_products: featuredProducts ?? 0,
    total_categories: totalCategories ?? 0,
    total_logs: totalLogs ?? 0,
  }

  const statCards = [
    { label: 'Total Products', value: stats.total_products, color: 'text-foreground' },
    { label: 'Active Products', value: stats.active_products, color: 'text-green-400' },
    { label: 'Featured', value: stats.featured_products, color: 'text-gold' },
    { label: 'Categories', value: stats.total_categories, color: 'text-blue-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Signed in as <span className="text-foreground">{user?.email ?? 'unknown'}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <p className="text-muted text-xs uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-10">
        <a href="/admin/products/new" className="bg-gold hover:bg-gold-light text-black text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200">
          + Add Product
        </a>
        <a href="/admin/categories/new" className="bg-foreground/5 hover:bg-foreground/10 border border-border text-foreground text-sm px-5 py-2.5 rounded-lg transition-colors">
          + Add Category
        </a>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-foreground font-medium mb-5">Recent Activity</h2>
        <AuditLogTable logs={(recentLogs ?? []) as AdminLog[]} />
      </div>
    </div>
  )
}
