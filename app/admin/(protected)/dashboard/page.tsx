import { createClient, createServiceClient } from '@/lib/supabase/server'
import AuditLogTable from '@/components/admin/AuditLogTable'
import { DashboardStats, AdminLog, OrderAnalytics } from '@/types'
import RefreshButton from './RefreshButton'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Stat({ label, value, color = 'text-foreground', sub }: {
  label: string; value: string | number; color?: string; sub?: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-muted text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-muted text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: featuredProducts },
    { count: totalCategories },
    { count: totalLogs },
    { data: recentLogs },
    { data: analyticsRow },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('admin_logs').select('*', { count: 'exact', head: true }),
    supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10),
    serviceSupabase.from('order_analytics').select('*').single(),
  ])

  const stats: DashboardStats = {
    total_products: totalProducts ?? 0,
    active_products: activeProducts ?? 0,
    featured_products: featuredProducts ?? 0,
    total_categories: totalCategories ?? 0,
    total_logs: totalLogs ?? 0,
  }

  const a = analyticsRow as OrderAnalytics | null
  const dailyVol = a?.daily_volume ?? []
  const maxCount = Math.max(...dailyVol.map(d => d.count), 1)

  const inventoryCards = [
    { label: 'Total Products',  value: stats.total_products,    color: 'text-foreground' },
    { label: 'Active Products', value: stats.active_products,   color: 'text-green-600' },
    { label: 'Featured',        value: stats.featured_products, color: 'text-gold' },
    { label: 'Categories',      value: stats.total_categories,  color: 'text-blue-500' },
  ]

  return (
    <div className="p-8 space-y-10">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Signed in as <span className="text-foreground">{user?.email ?? 'unknown'}</span>
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* ── Catalog inventory ───────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Catalog</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {inventoryCards.map(s => (
            <Stat key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </section>

      {/* ── Quick Actions ───────────────────────────────────────── */}
      <div className="flex gap-3">
        <a href="/admin/products/new"
          className="bg-gold hover:bg-gold-light text-black text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200">
          + Add Product
        </a>
        <a href="/admin/categories/new"
          className="bg-foreground/5 hover:bg-foreground/10 border border-border text-foreground text-sm px-5 py-2.5 rounded-lg transition-colors">
          + Add Category
        </a>
      </div>

      {a ? (
        <>
          {/* ── Revenue cards ───────────────────────────────────── */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-muted mb-3">Revenue</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Total Revenue"   value={fmt(a.total_revenue)}      color="text-gold" />
              <Stat label="This Month"      value={fmt(a.revenue_this_month)} color="text-foreground"
                sub={a.orders_this_month + ' orders'} />
              <Stat label="This Week"       value={fmt(a.revenue_this_week)}  color="text-foreground"
                sub={a.orders_this_week + ' orders'} />
              <Stat label="Avg Order Value" value={fmt(a.avg_order_value)}    color="text-foreground"
                sub={a.total_orders + ' total orders'} />
            </div>
          </section>

          {/* ── Status + Delivery split ─────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Order status chips */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-foreground font-medium mb-5">Order Status</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    label: 'Pending', value: a.pending_count,
                    bg: a.pending_count > 0
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-surface border-border text-foreground',
                  },
                  { label: 'Confirmed', value: a.confirmed_count, bg: 'bg-blue-50 border-blue-200 text-blue-800' },
                  { label: 'Delivered', value: a.delivered_count, bg: 'bg-green-50 border-green-200 text-green-800' },
                  { label: 'Cancelled', value: a.cancelled_count, bg: 'bg-red-50 border-red-200 text-red-700' },
                ] as const).map(s => (
                  <div key={s.label} className={'border rounded-lg p-4 ' + s.bg}>
                    <p className="text-xs uppercase tracking-wider opacity-70 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery area bars */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-foreground font-medium mb-5">Delivery Area</h2>
              {a.total_orders === 0 ? (
                <p className="text-muted text-sm">No orders yet.</p>
              ) : (
                <>
                  {([
                    { label: 'Beirut',  count: a.beirut_count,  color: 'bg-gold' },
                    { label: 'Outside', count: a.outside_count, color: 'bg-blue-400' },
                  ] as const).map(row => {
                    const pct = Math.round((row.count / a.total_orders) * 100)
                    return (
                      <div key={row.label} className="mb-4">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground">{row.label}</span>
                          <span className="text-muted">{row.count} &middot; {pct}%</span>
                        </div>
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div className={'h-full rounded-full ' + row.color}
                            style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                  {(a.top_cities ?? []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Top Cities</p>
                      <div className="flex flex-wrap gap-2">
                        {(a.top_cities ?? []).map(c => (
                          <span key={c.city}
                            className="text-xs bg-foreground/5 border border-border rounded-full px-2.5 py-1">
                            {c.city} <span className="text-muted">({c.count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── Top products table ──────────────────────────────── */}
          {(a.top_products ?? []).length > 0 && (
            <section className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-foreground font-medium mb-5">Top Products by Units Sold</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      {['#', 'Product', 'Units', 'Revenue'].map(h => (
                        <th key={h}
                          className={'pb-3 text-muted font-normal text-xs uppercase tracking-wider'
                            + (h === 'Units' || h === 'Revenue' ? ' text-right' : '')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(a.top_products ?? []).map((p, i) => (
                      <tr key={p.name} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-muted w-8">{i + 1}</td>
                        <td className="py-3 pr-4 text-foreground font-medium">{p.name}</td>
                        <td className="py-3 pr-4 text-right text-foreground">{p.qty}</td>
                        <td className="py-3 text-right text-gold font-medium">{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Daily volume bar chart ──────────────────────────── */}
          {dailyVol.length > 0 && (
            <section className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-foreground font-medium mb-6">Daily Orders &mdash; Last 30 Days</h2>
              <div className="flex items-end gap-1 h-28 overflow-x-auto pb-6">
                {dailyVol.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0"
                    style={{ minWidth: '20px' }}>
                    <span className="text-[10px] text-muted leading-none">
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div
                      className="w-4 bg-gold/70 hover:bg-gold rounded-t transition-colors cursor-default"
                      style={{ height: Math.max(4, Math.round((d.count / maxCount) * 64)) + 'px' }}
                      title={d.date + ': ' + d.count + (d.count === 1 ? ' order' : ' orders')}
                    />
                    <span className="text-[9px] text-muted rotate-45 origin-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* ── No analytics / no orders yet ──────────────────────── */
        <section className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm">No order analytics yet.</p>
          <p className="text-muted/60 text-xs mt-1">
            Analytics will appear automatically once the first order is placed.
          </p>
        </section>
      )}

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-foreground font-medium mb-5">Recent Activity</h2>
        <AuditLogTable logs={(recentLogs ?? []) as AdminLog[]} />
      </section>

    </div>
  )
}
