import Link from 'next/link'
import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'
import { requireCustomer } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import CancelOrderButton from '@/components/public/CancelOrderButton'
import { expirePendingOrders } from '@/lib/orders/maintenance'

export const dynamic = 'force-dynamic'

const TITLE = 'Your orders'
const DESCRIPTION = 'Your Enchanted orders and their current delivery status.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/orders' },
  robots: { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/orders', siteName: SITE_NAME, type: 'website', locale: 'en_LB' },
}

type Status = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
type OrderRow = {
  id: string
  order_number: string
  status: Status
  city: string
  area: string
  delivery_fee_cents: number
  total_cents: number
  created_at: string
  pending_expires_at: string | null
}
type ItemRow = {
  product_name: string
  size: string | null
  color_name: string | null
  quantity: number
  line_total_cents: number
}

const STATUS: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Awaiting confirmation', className: 'text-signal-warn border-signal-warn/50' },
  confirmed: { label: 'Confirmed', className: 'text-ink border-line-strong' },
  preparing: { label: 'Being prepared', className: 'text-ink border-line-strong' },
  out_for_delivery: { label: 'Out for delivery', className: 'text-ink border-line-strong' },
  delivered: { label: 'Delivered', className: 'text-signal-ok border-signal-ok/50' },
  cancelled: { label: 'Cancelled', className: 'text-signal-error border-signal-error/50' },
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function OrdersPage() {
  const session = await requireCustomer('/orders')
  const db = await getD1Database()
  if (db) await expirePendingOrders(db)
  const orderRows = db
    ? await db.prepare(
        `SELECT id, order_number, status, city, area, delivery_fee_cents, total_cents, created_at, pending_expires_at
         FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
      ).bind(session.user.id).all<OrderRow>()
    : { results: [] as OrderRow[] }
  const itemResults = db && orderRows.results.length
    ? await db.batch<ItemRow>(orderRows.results.map((order) => db.prepare(
        `SELECT product_name, size, color_name, quantity, line_total_cents
         FROM order_items WHERE order_id = ? ORDER BY created_at, id`,
      ).bind(order.id)))
    : []

  const orders = orderRows.results.map((order, index) => ({
    ...order,
    items: itemResults[index]?.results ?? [],
  }))

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/orders' }]} />
      <PageShell
        title={TITLE}
        standfirst="Every order appears here immediately, starting as awaiting confirmation."
        meta={orders.length ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}` : undefined}
      >
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href="/account/addresses" className="btn btn-ghost">Manage addresses</Link>
          <Link href="/track-order" className="btn btn-ghost">Track by order number</Link>
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-lg text-ink">No orders yet.</p>
            <p>Your first order will appear here as soon as it is sent.</p>
            <Link href="/#catalog" className="btn btn-primary mt-2">Shop All</Link>
          </div>
        ) : (
          <ul className="flex flex-col">
            {orders.map((order) => {
              const status = STATUS[order.status]
              return (
                <li key={order.id} className="border-t border-line py-8 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="tnum text-[0.9375rem] text-ink">Order {order.order_number}</p>
                      <p className="t-meta mt-1.5">
                        {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`t-meta border px-2.5 py-1.5 ${status.className}`}>{status.label}</span>
                  </div>
                  <ul className="mt-6 flex flex-col gap-2">
                    {order.items.map((item, index) => (
                      <li key={index} className="flex justify-between gap-4 text-[0.875rem]">
                        <span className="text-ink-dim">
                          {item.product_name}
                          {item.color_name ? `, ${item.color_name}` : ''}
                          {item.size ? `, size ${item.size}` : ''}
                          {item.quantity > 1 ? `, ${item.quantity} pieces` : ''}
                        </span>
                        <span className="tnum shrink-0 text-ink">{money(item.line_total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-5 flex flex-wrap justify-between gap-3 border-t border-line pt-4 text-[0.875rem]">
                    <div className="flex gap-2"><dt className="text-ink-faint">Delivery</dt><dd className="text-ink-dim">{order.area}, {order.city} · {money(order.delivery_fee_cents)}</dd></div>
                    <div className="flex gap-2"><dt className="text-ink-faint">Total</dt><dd className="tnum text-ink">{money(order.total_cents)}</dd></div>
                  </dl>
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <>
                      {order.status === 'pending' && order.pending_expires_at && (
                        <p className="mt-3 text-sm text-ink-dim">
                          Stock reserved until {new Date(order.pending_expires_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.
                        </p>
                      )}
                      <CancelOrderButton orderId={order.id} orderNumber={order.order_number} />
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </PageShell>
    </>
  )
}
