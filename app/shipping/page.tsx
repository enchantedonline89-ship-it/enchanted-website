import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Shipping and delivery'
const DESCRIPTION =
  'Where we deliver, what it costs, and how long an order usually takes to arrive.'

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
    locale: 'en_US',
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
        standfirst="Where we deliver, what it costs, and how long an order usually takes to arrive."
        meta="Last updated August 2026"
      >
      <div>
        <section>
          <h2>Delivery areas and fees</h2>
          <ul>
            <li>Anywhere in Lebanon: $4</li>
          </ul>
        </section>

        <section>
          <h2>Estimated delivery time</h2>
          <p>1-3 business days within Beirut; 2-5 business days elsewhere in Lebanon.</p>
        </section>

        <section>
          <h2>How it works</h2>
          <p>Place your order on site → We send you a WhatsApp confirmation → Delivery is coordinated directly with you.</p>
        </section>

        <section>
          <h2>Order tracking</h2>
          <p>
            Message us on{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              WhatsApp
            </a>{' '}
            with your order reference number for a status update.
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
