import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getD1Database } from '@/lib/cloudflare/d1'
import OrderStatusForm, { type OrderStatus } from './OrderStatusForm'

export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  order_number: string
  status: OrderStatus
  user_email: string
  recipient_name: string
  phone_e164: string
  governorate: string
  city: string
  area: string
  street: string
  building: string | null
  floor: string | null
  landmark: string | null
  delivery_notes: string | null
  order_notes: string | null
  subtotal_cents: number
  discount_cents: number
  delivery_fee_cents: number
  total_cents: number
  created_at: string
}
type ItemRow = {
  id: string
  product_name: string
  sku: string | null
  size: string | null
  color_name: string | null
  color_hex: string | null
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}
type HistoryRow = { id: string; status: OrderStatus; public_note: string | null; created_at: string }

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = await getD1Database()
  if (!db) notFound()
  const [order, items, history] = await Promise.all([
    db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>(),
    db.prepare(
      `SELECT id, product_name, sku, size, color_name, color_hex, quantity,
              unit_price_cents, line_total_cents
       FROM order_items WHERE order_id = ? ORDER BY created_at, id`,
    ).bind(id).all<ItemRow>(),
    db.prepare(
      `SELECT id, status, public_note, created_at
       FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC`,
    ).bind(id).all<HistoryRow>(),
  ])
  if (!order) notFound()

  return (
    <div className="max-w-4xl p-4 sm:p-8">
      <div className="mb-6">
        <Link href="/admin/orders" className="t-meta link-grow text-ink-dim hover:text-ink">Back to orders</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl text-ink">Order {order.order_number}</h1><p className="t-meta mt-1 capitalize">{order.status.replaceAll('_', ' ')}</p></div>
          <p className="tnum text-lg text-ink">{money(order.total_cents)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="border border-line bg-paper-raised p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Customer</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="t-meta">Name</dt><dd className="mt-1 text-ink">{order.recipient_name}</dd></div>
            <div><dt className="t-meta">Email</dt><dd className="mt-1 break-all text-ink">{order.user_email}</dd></div>
            <div><dt className="t-meta">Phone</dt><dd className="tnum mt-1 text-ink">{order.phone_e164}</dd></div>
          </dl>
        </section>

        <section className="border border-line bg-paper-raised p-5">
          <h2 className="mb-3 text-sm font-medium text-ink">Delivery address</h2>
          <p className="text-sm leading-6 text-ink">
            {order.street}{order.building ? `, ${order.building}` : ''}{order.floor ? `, floor ${order.floor}` : ''}<br />
            {order.area}, {order.city}, {order.governorate}, Lebanon
          </p>
          {order.landmark && <p className="mt-2 text-sm text-ink-dim">Landmark: {order.landmark}</p>}
          {order.delivery_notes && <p className="mt-2 text-sm text-ink-dim">Delivery note: {order.delivery_notes}</p>}
          {order.order_notes && <p className="mt-2 text-sm text-ink-dim">Order note: {order.order_notes}</p>}
        </section>
      </div>

      <section className="mt-5 border border-line bg-paper-raised p-5">
        <h2 className="mb-4 text-sm font-medium text-ink">Items</h2>
        <ul className="divide-y divide-line">
          {items.results.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 first:pt-0">
              <div><p className="text-sm text-ink">{item.product_name} × {item.quantity}</p><p className="t-meta mt-1">{[item.color_name, item.size && `Size ${item.size}`, item.sku].filter(Boolean).join(' · ')}</p></div>
              <p className="tnum shrink-0 text-sm text-ink">{money(item.line_total_cents)}</p>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-dim">Subtotal</dt><dd className="tnum">{money(order.subtotal_cents)}</dd></div>
          {order.discount_cents > 0 && <div className="flex justify-between"><dt className="text-ink-dim">Discount</dt><dd className="tnum">-{money(order.discount_cents)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-dim">Delivery</dt><dd className="tnum">{money(order.delivery_fee_cents)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd className="tnum">{money(order.total_cents)}</dd></div>
        </dl>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="border border-line bg-paper-raised p-5"><h2 className="mb-3 text-sm font-medium text-ink">Update status</h2><OrderStatusForm orderId={order.id} currentStatus={order.status} /></section>
        <section className="border border-line bg-paper-raised p-5"><h2 className="mb-3 text-sm font-medium text-ink">Timeline</h2><ol className="space-y-3">{history.results.map((entry) => <li key={entry.id} className="border-l border-line pl-3"><p className="text-sm capitalize text-ink">{entry.status.replaceAll('_', ' ')}</p><p className="t-meta mt-1">{new Date(entry.created_at).toLocaleString('en-GB')}</p></li>)}</ol></section>
      </div>
    </div>
  )
}
