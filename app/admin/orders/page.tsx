import { createServiceClient } from '@/lib/supabase/server'
import { Order } from '@/types'
import { isSupabaseMockMode } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const mockOrders: Order[] = [
  {
    id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
    user_id: 'mock-user-id',
    user_email: 'test@enchanted.style',
    full_name: 'Test User',
    phone: '71234567',
    delivery_address: '123 Main St, Apt 4',
    city: null,
    area: 'beirut',
    delivery_fee: 3,
    order_notes: null,
    items: [{ product_id: 'p-1', name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 89.99 }],
    subtotal: 89.99,
    total: 92.99,
    status: 'pending',
    created_at: new Date().toISOString(),
  },
]

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}

export default async function AdminOrdersPage() {
  let orders: Order[] = []

  if (isSupabaseMockMode()) {
    orders = mockOrders
  } else {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    orders = (data ?? []) as Order[]
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground">Orders</h1>
        <p className="text-muted text-sm mt-1">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-muted text-sm">No orders yet.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted text-xs font-medium uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-muted text-xs font-medium uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-muted text-xs font-medium uppercase tracking-wider hidden md:table-cell">Area</th>
                <th className="text-right px-4 py-3 text-muted text-xs font-medium uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-muted text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-foreground text-xs">#{order.id.slice(0, 8)}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground text-xs font-medium">{order.full_name}</p>
                    <p className="text-muted text-xs">{order.phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-foreground text-xs">
                      {order.area === 'beirut' ? 'Beirut' : `Outside${order.city ? ` — ${order.city}` : ''}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-gold font-semibold text-xs">${order.total.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/orders/${order.id}`} className="text-muted hover:text-gold text-xs transition-colors">
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
