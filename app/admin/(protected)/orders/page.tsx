import Link from 'next/link'
import { getD1Database } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
type OrderRow = {
  id: string
  order_number: string
  recipient_name: string
  phone_e164: string
  city: string
  area: string
  total_cents: number
  status: OrderStatus
  created_at: string
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-signal-warn/10 text-signal-warn',
  confirmed: 'bg-paper-sunken text-ink',
  preparing: 'bg-paper-sunken text-ink',
  out_for_delivery: 'bg-paper-sunken text-ink',
  delivered: 'bg-signal-ok/10 text-signal-ok',
  cancelled: 'bg-signal-error/10 text-signal-error',
}

const FILTERS = [
  { id: 'unconfirmed', label: 'Unconfirmed', statuses: ['pending'] },
  { id: 'active', label: 'Confirmed & active', statuses: ['confirmed', 'preparing', 'out_for_delivery'] },
  { id: 'completed', label: 'Completed', statuses: ['delivered', 'cancelled'] },
  { id: 'all', label: 'All', statuses: [] },
] as const

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const requested = (await searchParams).view ?? 'unconfirmed'
  const filter = FILTERS.find((entry) => entry.id === requested) ?? FILTERS[0]
  const db = await getD1Database()
  const result = db
    ? await db.prepare(
        `SELECT id, order_number, recipient_name, phone_e164, city, area,
                total_cents, status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 250`,
      ).all<OrderRow>()
    : { results: [] as OrderRow[] }
  const allOrders = result.results
  const orders = filter.statuses.length
    ? allOrders.filter((order) => (filter.statuses as readonly string[]).includes(order.status))
    : allOrders

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-3xl text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink-dim">Every new order begins in Unconfirmed.</p>
      </div>
      <nav aria-label="Order views" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((entry) => {
          const count = entry.statuses.length
            ? allOrders.filter((order) => (entry.statuses as readonly string[]).includes(order.status)).length
            : allOrders.length
          return (
            <Link
              key={entry.id}
              href={`/admin/orders?view=${entry.id}`}
              aria-current={filter.id === entry.id ? 'page' : undefined}
              className={`min-h-11 border px-4 py-2.5 text-sm ${filter.id === entry.id ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim'}`}
            >
              {entry.label} <span className="tnum ml-1">{count}</span>
            </Link>
          )
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="border border-line bg-paper-raised p-12 text-center">
          <p className="text-sm text-ink-dim">No {filter.label.toLowerCase()} orders.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-line bg-paper-raised">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="border-b border-line">
                <th className="px-4 py-3 text-left t-meta">Order</th>
                <th className="px-4 py-3 text-left t-meta">Customer</th>
                <th className="px-4 py-3 text-left t-meta">Delivery</th>
                <th className="px-4 py-3 text-right t-meta">Total</th>
                <th className="px-4 py-3 text-left t-meta">Status</th>
                <th className="px-4 py-3"><span className="sr-only">Open</span></th>
              </tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-line last:border-0 hover:bg-ink/[0.04]">
                    <td className="px-4 py-3"><p className="tnum text-xs text-ink">{order.order_number}</p><p className="t-meta mt-1">{new Date(order.created_at).toLocaleDateString('en-GB')}</p></td>
                    <td className="px-4 py-3"><p className="text-xs text-ink">{order.recipient_name}</p><p className="tnum text-xs text-ink-dim">{order.phone_e164}</p></td>
                    <td className="px-4 py-3 text-xs text-ink-dim">{order.area}, {order.city}</td>
                    <td className="tnum px-4 py-3 text-right text-xs text-ink">${(order.total_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs capitalize ${STATUS_STYLE[order.status]}`}>{order.status.replaceAll('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/orders/${order.id}`} className="link-grow text-xs text-ink-dim hover:text-ink">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
