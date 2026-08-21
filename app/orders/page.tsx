import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'
import { Order } from '@/types'

export const dynamic = 'force-dynamic'

const TITLE = 'Your orders'
const DESCRIPTION =
  'Everything you have ordered from us, newest first, with where each one currently stands.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/orders' },
  // Auth-gated, customer-specific, and middleware.ts already redirects any
  // anonymous request away from this route. noindex is defence in depth
  // in case that redirect behaviour ever changes. follow stays true: the
  // outbound "Browse the catalog" link should still pass through.
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/orders',
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

/** Status carries a word and a colour. No decorative dot. */
const STATUS: Record<Order['status'], { label: string; className: string }> = {
  pending: { label: 'Awaiting confirmation', className: 'text-signal-warn border-signal-warn/50' },
  confirmed: { label: 'Confirmed, on its way', className: 'text-ink border-line-strong' },
  delivered: { label: 'Delivered', className: 'text-signal-ok border-signal-ok/50' },
  cancelled: { label: 'Cancelled', className: 'text-signal-error border-signal-error/50' },
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const list = (orders ?? []) as Order[]

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/orders' }]} />
      <PageShell
        title="Your orders"
        standfirst="Everything you have ordered from us, newest first, with where each one currently stands."
        meta={list.length > 0 ? `${list.length} ${list.length === 1 ? 'order' : 'orders'}` : undefined}
      >
      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-lg text-ink">No orders yet.</p>
          <p className="max-w-[60ch]">
            When you place your first order it will appear here, along with its
            delivery status and the total due to the driver.
          </p>
          <Link href="/#catalog" className="btn btn-primary mt-2">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {list.map((order) => {
            const status = STATUS[order.status]
            return (
              <li key={order.id} className="border-t border-line py-8 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div>
                    <p className="tnum text-[0.9375rem] text-ink">
                      Order {order.order_number}
                    </p>
                    <p className="t-meta mt-1.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`t-meta border px-2.5 py-1.5 ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <ul className="mt-6 flex flex-col gap-2">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-4 text-[0.875rem]">
                      <span className="text-ink-dim">
                        {item.name}
                        {item.size ? `, size ${item.size}` : ''}
                        {item.qty > 1 ? `, ${item.qty} pieces` : ''}
                      </span>
                      <span className="tnum shrink-0 text-ink">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line pt-4 text-[0.875rem]">
                  <div className="flex gap-2">
                    <dt className="text-ink-faint">Delivery</dt>
                    <dd className="tnum text-ink-dim">
                      {order.area === 'beirut'
                        ? 'Beirut'
                        : `Outside Beirut${order.city ? `, ${order.city}` : ''}`}
                      , ${order.delivery_fee.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-faint">Total</dt>
                    <dd className="tnum text-ink">${order.total.toFixed(2)}</dd>
                  </div>
                </dl>
                <Link
                  href="/track-order"
                  className="t-meta link-grow mt-4 inline-flex text-ink-dim hover:text-ink"
                >
                  Track this order
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      </PageShell>
    </>
  )
}
