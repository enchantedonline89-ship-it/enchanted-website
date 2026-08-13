import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Returns and cancellations'
const DESCRIPTION =
  'Your right to cancel, the condition items must come back in, and how refunds work.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/returns' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/returns',
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

export default function ReturnsPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/returns' }]} />
      <PageShell
        title="Returns and cancellations"
        standfirst="Your right to cancel, the condition items must come back in, and how refunds work."
        meta="Last updated March 2026"
      >
      <div>
        <section>
          <h2>Your right to cancel</h2>
          <p>
            Per Lebanese Consumer Protection Law, you have 10 days from receipt to cancel your order, provided items are unused, unworn, and have original tags attached.
          </p>
        </section>

        <section>
          <h2>How to start a return</h2>
          <p>
            Contact us via{' '}
            <a href="https://wa.me/96181351084" className="text-ink hover:underline">
              WhatsApp
            </a>{' '}
            within 10 days with your order reference number; we will arrange pickup or confirm a drop-off point.
          </p>
        </section>

        <section>
          <h2>Condition requirements</h2>
          <p>Items must be unworn, unwashed, in original packaging with all tags attached.</p>
        </section>

        <section>
          <h2>Refund process</h2>
          <p>
            Refunds are issued via Whish Money or cash on collection within 7 business days of receiving the returned item. Note: all orders are cash on delivery, no card on file.
          </p>
        </section>

        <section>
          <h2>Non-Returnable items</h2>
          <ul>
            <li>Items marked Final Sale at time of purchase</li>
            <li>Items that have been worn or washed</li>
            <li>Returns initiated after 10 days from receipt</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Message us on WhatsApp:{' '}
            <a href="https://wa.me/96181351084" className="text-ink hover:underline">
              +961 81 351 084
            </a>
          </p>
        </section>
      </div>
      </PageShell>
    </>
  )
}
