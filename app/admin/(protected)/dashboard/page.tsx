import { createClient, createServiceClient } from '@/lib/supabase/server'
import AuditLogTable from '@/components/admin/AuditLogTable'
import { DashboardStats, AdminLog, OrderAnalytics } from '@/types'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Stat({ label, value, color = 'text-ink', sub }: {
  label: string; value: string | number; color?: string; sub?: string
}) {
  return (
    <div className="bg-paper-raised border border-line p-5">
      <p className="text-ink-dim text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-ink-dim text-xs mt-1">{sub}</p>}
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
    { data: analyticsRow, error: analyticsError },
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
    { label: 'Total Products',  value: stats.total_products,    color: 'text-ink' },
    { label: 'Active Products', value: stats.active_products,   color: 'text-signal-ok' },
    { label: 'Featured',        value: stats.featured_products, color: 'text-ink' },
    { label: 'Categories',      value: stats.total_categories,  color: 'text-ink' },
  ]

  return (
    <div className="p-4 sm:p-8 space-y-10">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-ink">Dashboard</h1>
          <p className="text-ink-dim text-sm mt-1">
            Signed in as <span className="text-ink">{user?.email ?? 'unknown'}</span>
          </p>
        </div>
      </div>

      {/* ── Catalog inventory ───────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-ink-dim mb-3">Catalog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventoryCards.map(s => (
            <Stat key={s.label} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      </section>

      {/* ── Quick Actions ───────────────────────────────────────── */}
      <div className="flex gap-3">
        <a href="/admin/products/new"
          className="btn btn-primary">
          + Add Product
        </a>
        <a href="/admin/categories/new"
          className="btn btn-ghost">
          + Add Category
        </a>
      </div>

      {a ? (
        <>
          {/* ── Revenue cards ───────────────────────────────────── */}
          <section id="analytics" className="scroll-mt-8">
            <h2 className="text-xs uppercase tracking-widest text-ink-dim mb-3">Revenue</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat label="Delivered Revenue" value={fmt(a.total_revenue)} color="text-ink"
                sub={`${a.delivered_count} completed orders`} />
              <Stat label="This Month"      value={fmt(a.revenue_this_month)} color="text-ink"
                sub={a.orders_this_month + ' valid orders'} />
              <Stat label="Open Pipeline"   value={fmt(a.pipeline_value ?? 0)} color="text-signal-warn"
                sub={`${a.pending_count + a.confirmed_count} open orders`} />
              <Stat label="Avg Order Value" value={fmt(a.avg_order_value)}    color="text-ink"
                sub={`${a.completion_rate ?? 0}% completion rate`} />
            </div>
          </section>

          {/* ── Status + Delivery split ─────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Order status chips */}
            <div className="bg-paper-raised border border-line p-6">
              <h2 className="text-ink font-medium mb-5">Order Status</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    label: 'Pending', value: a.pending_count,
                    bg: a.pending_count > 0
                      ? 'bg-signal-warn/10 border-signal-warn/40 text-signal-warn'
                      : 'bg-paper-raised border-line text-ink',
                  },
                  { label: 'Confirmed', value: a.confirmed_count, bg: 'bg-paper-raised border-line-strong text-ink' },
                  { label: 'Delivered', value: a.delivered_count, bg: 'bg-signal-ok/10 border-signal-ok/40 text-signal-ok' },
                  { label: 'Cancelled', value: a.cancelled_count, bg: 'bg-signal-error/10 border-signal-error/40 text-signal-error' },
                ] as const).map(s => (
                  <div key={s.label} className={'border p-4' + s.bg}>
                    <p className="text-xs uppercase tracking-wider opacity-70 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery area bars */}
            <div className="bg-paper-raised border border-line p-6">
              <h2 className="text-ink font-medium mb-5">Delivery Area</h2>
              {a.total_orders === 0 ? (
                <p className="text-ink-dim text-sm">No orders yet.</p>
              ) : (
                <>
                  {([
                    { label: 'Beirut',  count: a.beirut_count,  color: 'bg-ink' },
                    { label: 'Outside', count: a.outside_count, color: 'bg-ink' },
                  ] as const).map(row => {
                    const pct = Math.round((row.count / a.total_orders) * 100)
                    return (
                      <div key={row.label} className="mb-4">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-ink">{row.label}</span>
                          <span className="text-ink-dim">{row.count} &middot; {pct}%</span>
                        </div>
                        <div className="h-2 bg-line overflow-hidden">
                          <div className={'h-full' + row.color}
                            style={{ width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                  {(a.top_cities ?? []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-line">
                      <p className="text-xs text-ink-dim uppercase tracking-wider mb-2">Top Cities</p>
                      <div className="flex flex-wrap gap-2">
                        {(a.top_cities ?? []).map(c => (
                          <span key={c.city}
                            className="text-xs bg-ink/8 border border-line px-2.5 py-1">
                            {c.city} <span className="text-ink-dim">({c.count})</span>
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
            <section className="bg-paper-raised border border-line p-6">
              <h2 className="text-ink font-medium mb-5">Top Products by Units Sold</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-line">
                      {['#', 'Product', 'Units', 'Revenue'].map(h => (
                        <th key={h}
                          className={'pb-3 text-ink-dim font-normal text-xs uppercase tracking-wider'
                            + (h === 'Units' || h === 'Revenue' ? ' text-right' : '')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(a.top_products ?? []).map((p, i) => (
                      <tr key={p.name} className="border-b border-line/50 last:border-0">
                        <td className="py-3 pr-4 text-ink-dim w-8">{i + 1}</td>
                        <td className="py-3 pr-4 text-ink font-medium">{p.name}</td>
                        <td className="py-3 pr-4 text-right text-ink">{p.qty}</td>
                        <td className="py-3 text-right text-ink font-medium">{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Daily volume bar chart ──────────────────────────── */}
          {dailyVol.length > 0 && (
            <section className="bg-paper-raised border border-line p-6">
              <h2 className="text-ink font-medium mb-6">Daily orders, last 30 days</h2>
              <div className="flex items-end gap-1 h-28 overflow-x-auto pb-6">
                {dailyVol.map(d => (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-shrink-0"
                    style={{ minWidth: '20px' }}>
                    <span className="text-[10px] text-ink-dim leading-none">
                      {d.count > 0 ? d.count : ''}
                    </span>
                    <div
                      className="w-4 bg-ink/70 hover:bg-ink transition-colors cursor-default"
                      style={{ height: Math.max(4, Math.round((d.count / maxCount) * 64)) + 'px' }}
                      title={d.date + ': ' + d.count + (d.count === 1 ? ' order' : ' orders')}
                    />
                    <span className="text-[9px] text-ink-dim rotate-45 origin-left whitespace-nowrap">
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
        <section className="bg-paper-raised border border-line p-8 text-center">
          <p className="text-ink-dim text-sm">
            {analyticsError ? 'Order analytics are temporarily unavailable.' : 'No order analytics yet.'}
          </p>
          <p className="text-ink-dim/60 text-xs mt-1">
            Analytics will appear automatically once the first order is placed.
          </p>
        </section>
      )}

      {/* ── Recent Activity ─────────────────────────────────────── */}
      <section className="bg-paper-raised border border-line p-6">
        <h2 className="text-ink font-medium mb-5">Recent Activity</h2>
        <AuditLogTable logs={(recentLogs ?? []) as AdminLog[]} />
      </section>

    </div>
  )
}
