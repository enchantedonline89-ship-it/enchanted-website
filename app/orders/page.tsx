import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Order } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pending:   'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-background pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <a href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-gold text-sm transition-colors mb-6">
            ← Back to shop
          </a>
          <h1 className="font-display text-3xl text-foreground mt-4">My Orders</h1>
          <p className="text-muted text-sm mt-1">Your order history with Enchanted Style</p>
        </div>

        {(!orders || orders.length === 0) ? (
          <div className="text-center py-20 border border-border rounded-2xl bg-surface">
            <p className="text-foreground text-lg font-display mb-2">No orders yet</p>
            <p className="text-muted text-sm mb-6">Start shopping and your orders will appear here.</p>
            <a href="/" className="inline-block bg-gold hover:bg-gold-light text-black text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-lg transition-colors">
              Shop Now
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {(orders as Order[]).map(order => (
              <div key={order.id} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-foreground text-sm font-medium font-mono">#{order.id.slice(0, 8)}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="space-y-1 mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted">
                        {item.name}{item.size ? ` (${item.size})` : ''} × {item.qty}
                      </span>
                      <span className="text-foreground">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="text-muted text-xs">
                    {order.area === 'beirut' ? 'Beirut' : `Outside Beirut${order.city ? ` — ${order.city}` : ''}`}
                    {' · '}Delivery ${order.delivery_fee.toFixed(2)}
                  </span>
                  <span className="text-gold font-semibold text-sm">${order.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
