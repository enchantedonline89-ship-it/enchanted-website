import Link from 'next/link'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { requireAdmin } from '@/lib/auth/server'
import { getDashboardAnalytics, getExternalAnalytics } from '@/lib/admin-analytics'

export const dynamic = 'force-dynamic'

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Stat({ label, value, detail, href }: { label: string; value: string | number; detail?: string; href?: string }) {
  const card = <><p className="t-meta mb-2">{label}</p><p className="tnum text-3xl text-ink">{value}</p>{detail && <p className="mt-2 text-xs text-ink-dim">{detail}</p>}</>
  return href
    ? <Link href={href} className="block border border-line bg-paper-raised p-5 transition-colors hover:border-line-strong">{card}</Link>
    : <div className="border border-line bg-paper-raised p-5">{card}</div>
}

export default async function DashboardPage() {
  const session = await requireAdmin()
  const [db, env] = await Promise.all([getD1Database(), getCloudflareEnv()])
  if (!db || !env) throw new Error('Dashboard bindings are unavailable.')
  const [data, external] = await Promise.all([
    getDashboardAnalytics(db),
    getExternalAnalytics(env),
  ])
  const openOrders = data.orders.pending + data.orders.confirmed + data.orders.preparing + data.orders.out_for_delivery
  const emailDeliveredRate = data.email.total
    ? Math.round((data.email.delivered / data.email.total) * 100)
    : 0

  return (
    <div className="space-y-10 p-4 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl text-ink">Dashboard</h1><p className="mt-1 text-sm text-ink-dim">Signed in as {session.user.email}</p></div>
        <div className="flex gap-2"><Link href="/admin/products/new" className="btn btn-primary">Add product</Link><Link href="/admin/categories/new" className="btn btn-ghost">Add category</Link></div>
      </header>

      <section>
        <h2 className="t-meta mb-3">Orders</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Unconfirmed" value={data.orders.pending} detail="Needs your confirmation" href="/admin/orders?view=unconfirmed" />
          <Stat label="Confirmed & active" value={openOrders - data.orders.pending} href="/admin/orders?view=active" />
          <Stat label="Delivered revenue" value={money(data.orders.delivered_revenue_cents)} detail={`${data.orders.delivered} delivered orders`} />
          <Stat label="Open pipeline" value={money(data.orders.pipeline_cents)} detail={`${openOrders} open orders`} />
        </div>
      </section>

      <section>
        <h2 className="t-meta mb-3">Catalog & customers</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active products" value={data.catalog.active_products} detail={`${data.catalog.total_products} total`} href="/admin/products" />
          <Stat label="Categories" value={data.catalog.categories} href="/admin/categories" />
          <Stat label="Tracked variants" value={data.catalog.tracked_variants} detail={`${data.catalog.low_stock_variants} low stock (3 or fewer)`} />
          <Stat label="Customer accounts" value={data.catalog.customers} />
        </div>
      </section>

      <section id="analytics" className="scroll-mt-8">
        <div className="mb-3 flex items-end justify-between gap-3"><h2 className="t-meta">Technical analytics</h2><p className="text-xs text-ink-faint">Sensitive form data is masked</p></div>
        <div className="grid gap-5 xl:grid-cols-3">
          <article className="border border-line bg-paper-raised p-5">
            <h3 className="text-lg text-ink">PostHog · last 7 days</h3>
            {!external.posthog.configured ? <p className="mt-3 text-sm text-ink-dim">Connect a PostHog project to show consented UI/UX activity.</p>
              : !external.posthog.available || !external.posthog.summary ? <p className="mt-3 text-sm text-signal-warn">PostHog is configured but its summary is unavailable.</p>
              : <dl className="mt-4 grid grid-cols-3 gap-2 text-center"><div><dt className="t-meta">Visitors</dt><dd className="tnum mt-1 text-xl">{external.posthog.summary.visitors}</dd></div><div><dt className="t-meta">Pageviews</dt><dd className="tnum mt-1 text-xl">{external.posthog.summary.pageviews}</dd></div><div><dt className="t-meta">Events</dt><dd className="tnum mt-1 text-xl">{external.posthog.summary.events}</dd></div></dl>}
          </article>

          <article className="border border-line bg-paper-raised p-5">
            <h3 className="text-lg text-ink">Sentry · unresolved</h3>
            {!external.sentry.configured ? <p className="mt-3 text-sm text-ink-dim">Connect Sentry to show production errors here.</p>
              : !external.sentry.available ? <p className="mt-3 text-sm text-signal-warn">Sentry is configured but its issue feed is unavailable.</p>
              : external.sentry.issues.length === 0 ? <p className="mt-3 text-sm text-signal-ok">No unresolved issues in the last 14 days.</p>
              : <ul className="mt-4 space-y-3">{external.sentry.issues.map((issue) => <li key={issue.id}><a href={issue.permalink ?? '#'} target="_blank" rel="noreferrer" className="link-grow text-sm text-ink">{issue.title}</a><p className="t-meta mt-1">{issue.count} events · {issue.level}</p></li>)}</ul>}
          </article>

          <article className="border border-line bg-paper-raised p-5">
            <h3 className="text-lg text-ink">Resend · last 30 days</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="t-meta">Tracked emails</dt><dd className="tnum mt-1 text-2xl">{data.email.total}</dd></div><div><dt className="t-meta">Delivered</dt><dd className="tnum mt-1 text-2xl">{emailDeliveredRate}%</dd></div><div><dt className="t-meta">Failed</dt><dd className="tnum mt-1 text-xl">{data.email.failed}</dd></div><div><dt className="t-meta">Bounced</dt><dd className="tnum mt-1 text-xl">{data.email.bounced}</dd></div></dl>
          </article>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="border border-line bg-paper-raised p-5">
          <h2 className="mb-4 text-lg text-ink">Top delivered products</h2>
          {data.topProducts.length === 0 ? <p className="text-sm text-ink-dim">Sales rankings will appear after delivered orders.</p> : <ol className="divide-y divide-line">{data.topProducts.map((product, index) => <li key={product.name} className="flex justify-between gap-4 py-3"><span className="text-sm text-ink">{index + 1}. {product.name}</span><span className="tnum text-sm text-ink-dim">{product.quantity} · {money(product.revenue_cents)}</span></li>)}</ol>}
        </section>
        <section className="border border-line bg-paper-raised p-5">
          <h2 className="mb-4 text-lg text-ink">Recent admin activity</h2>
          {data.logs.length === 0 ? <p className="text-sm text-ink-dim">No changes recorded yet.</p> : <ul className="divide-y divide-line">{data.logs.map((log) => <li key={log.id} className="py-3"><p className="text-sm text-ink">{log.action.replaceAll('_', ' ')} {log.entity_type}{log.entity_name ? ` · ${log.entity_name}` : ''}</p><p className="t-meta mt-1">{log.admin_email} · {new Date(log.created_at).toLocaleString('en-GB')}</p></li>)}</ul>}
        </section>
      </div>
    </div>
  )
}
