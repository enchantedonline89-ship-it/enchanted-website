import { createServiceClient } from '@/lib/supabase/server'
import { Order } from '@/types'
import { isSupabaseMockMode } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const mockOrders: Order[] = [
  {
    id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
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
  },
]

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pending:   'bg-signal-warn/10 text-signal-warn',
    confirmed: 'bg-paper-raised text-ink',
    delivered: 'bg-signal-ok/10 text-signal-ok',
    cancelled: 'bg-signal-error/10 text-signal-error',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 capitalize ${styles[status]}`}>
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
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-ink">Orders</h1>
        <p className="text-ink-dim text-sm mt-1">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-paper-raised border border-line p-12 text-center">
          <p className="text-ink-dim text-sm">No orders yet.</p>
        </div>
      ) : (
        <div className="bg-paper-raised border border-line overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-ink-dim text-xs font-medium uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-ink-dim text-xs font-medium uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-ink-dim text-xs font-medium uppercase tracking-wider hidden md:table-cell">Area</th>
                <th className="text-right px-4 py-3 text-ink-dim text-xs font-medium uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-ink-dim text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-line last:border-0 hover:bg-ink/[0.04] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-ink text-xs">{order.order_number}</p>
                    <p className="text-ink-dim text-xs mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink text-xs font-medium">{order.full_name}</p>
                    <p className="text-ink-dim text-xs">{order.phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-ink text-xs">
                      {order.area === 'beirut' ? 'Beirut' : `Outside${order.city ? ` - ${order.city}` : ''}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-ink font-semibold text-xs">${order.total.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/orders/${order.id}`} className="text-ink-dim hover:text-ink text-xs transition-colors">
                      View
                    </a>
                  </td>
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
