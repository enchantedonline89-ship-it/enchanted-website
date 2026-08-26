import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Shipping and delivery'
const DESCRIPTION =
  'Where Enchanted Style delivers, what it costs, and how to track an order.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/shipping' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/shipping',
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_LB',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function ShippingPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/shipping' }]} />
      <PageShell
        title="Shipping and delivery"
        standfirst="Where we deliver, what it costs, and how to track an order."
        meta="Last updated 26 August 2026"
      >
      <div>
        <section>
          <h2>Delivery areas and fees</h2>
          <ul>
            <li>Anywhere in Lebanon: $4</li>
          </ul>
        </section>

        <section>
          <h2>Delivery timing</h2>
          <p>Delivery timing varies by destination. Your order status remains available on the tracking page.</p>
        </section>

        <section>
          <h2>How it works</h2>
          <p>Place your order on the site → Receive your order number and email updates → Pay the driver in cash when the order arrives.</p>
        </section>

        <section>
          <h2>Order tracking</h2>
          <p>
            Check your latest status on the{' '}
            <a href="/track-order" className="text-ink hover:underline">
              order tracking page
            </a>{' '}
            using your order number and checkout email. You may also contact us on{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              WhatsApp
            </a>{' '}
            with your order number if you want help.
          </p>
        </section>

        <section>
          <h2>Questions?</h2>
          <p>
            Message us on WhatsApp:{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              +961 81 492 994
            </a>
          </p>
        </section>
      </div>
      </PageShell>
    </>
  )
}
