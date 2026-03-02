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
      user_id: 'mock-user-id',
      user_email: 'test@enchanted.style',
      full_name: 'Test User',
      phone: '71234567',
      delivery_address: '123 Main St, Apt 4',
      city: null,
      area: 'beirut',
      delivery_fee: 3,
      order_notes: null,
      items: [{ name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 89.99 }],
      subtotal: 89.99,
      total: 92.99,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
  } else {
    const supabase = await createServiceClient()
    const { data } = await supabase.from('orders').select('*').eq('id', id).single()
    if (!data) notFound()
    order = data as Order
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <a href="/admin/orders" className="text-muted hover:text-foreground text-sm transition-colors">
          ← Orders
        </a>
        <h1 className="font-display text-2xl text-foreground">Order #{order.id.slice(0, 8)}</h1>
      </div>

      <div className="space-y-5">
        {/* Customer */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-foreground font-medium text-sm mb-3">Customer</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Name</dt>
              <dd className="text-foreground">{order.full_name}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Email</dt>
              <dd className="text-foreground">{order.user_email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Phone</dt>
              <dd className="text-foreground">{order.phone}</dd>
            </div>
          </dl>
        </div>

        {/* Delivery */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-foreground font-medium text-sm mb-3">Delivery</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Area</dt>
              <dd className="text-foreground">
                {order.area === 'beirut' ? 'Beirut' : `Outside Beirut${order.city ? ` — ${order.city}` : ''}`}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Address</dt>
              <dd className="text-foreground">{order.delivery_address}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted w-28 shrink-0">Delivery fee</dt>
              <dd className="text-foreground">${order.delivery_fee.toFixed(2)}</dd>
            </div>
            {order.order_notes && (
              <div className="flex gap-3">
                <dt className="text-muted w-28 shrink-0">Notes</dt>
                <dd className="text-foreground">{order.order_notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Items */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-foreground font-medium text-sm mb-3">Items</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-foreground">
                  {item.name}{item.size ? ` (${item.size})` : ''} × {item.qty}
                </span>
                <span className="text-gold">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-gold">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-foreground font-medium text-sm mb-3">Order Status</h2>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
        </div>
      </div>
    </div>
  )
}
