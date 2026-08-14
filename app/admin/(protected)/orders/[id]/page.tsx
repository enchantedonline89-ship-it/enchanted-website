import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Order } from '@/types'
import { isSupabaseMockMode } from '@/lib/mock-data'
import OrderStatusForm from './OrderStatusForm'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let order: Order | null = null

  if (isSupabaseMockMode()) {
    order = {
      id,
      order_number: 'ES-2608-001001',
      user_id: 'mock-user-id',
      user_email: 'test@enchanted.style',
      full_name: 'Test User',
      phone: '71234567',
      delivery_address: '123 Main St, Apt 4',
      city: null,
      area: 'beirut',
      delivery_fee: 4,
      order_notes: null,
      items: [{ name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 89.99 }],
      subtotal: 89.99,
      total: 93.99,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  } else {
    const supabase = await createServiceClient()
    const { data } = await supabase.from('orders').select('*').eq('id', id).single()
    if (!data) notFound()
    order = data as Order
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/orders" className="t-meta link-grow text-ink-dim hover:text-ink">
          Back to orders
        </Link>
        <h1 className="text-2xl text-ink">Order {order.order_number}</h1>
      </div>

      <div className="space-y-5">
        {/* Customer */}
        <div className="bg-paper-raised border border-line p-5">
          <h2 className="text-ink font-medium text-sm mb-3">Customer</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Name</dt>
              <dd className="text-ink">{order.full_name}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Email</dt>
              <dd className="text-ink">{order.user_email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Phone</dt>
              <dd className="text-ink">{order.phone}</dd>
            </div>
          </dl>
        </div>

        {/* Delivery */}
        <div className="bg-paper-raised border border-line p-5">
          <h2 className="text-ink font-medium text-sm mb-3">Delivery</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Area</dt>
              <dd className="text-ink">
                {order.area === 'beirut' ? 'Beirut' : `Outside Beirut${order.city ? ` - ${order.city}` : ''}`}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Address</dt>
              <dd className="text-ink">{order.delivery_address}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-ink-dim w-28 shrink-0">Delivery fee</dt>
              <dd className="text-ink">${order.delivery_fee.toFixed(2)}</dd>
            </div>
            {order.order_notes && (
              <div className="flex gap-3">
                <dt className="text-ink-dim w-28 shrink-0">Notes</dt>
                <dd className="text-ink">{order.order_notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Items */}
        <div className="bg-paper-raised border border-line p-5">
          <h2 className="text-ink font-medium text-sm mb-3">Items</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-ink">
                  {item.name}{item.size ? ` (${item.size})` : ''}, {item.qty} pieces
                </span>
                <span className="text-ink">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-line pt-2 mt-2 flex justify-between text-sm font-semibold">
              <span className="text-ink">Total</span>
              <span className="text-ink">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-paper-raised border border-line p-5">
          <h2 className="text-ink font-medium text-sm mb-3">Order Status</h2>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
        </div>
      </div>
    </div>
  )
}
