import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Returns and cancellations'
const DESCRIPTION =
  'How to request a cancellation or return and what information to provide.'

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
    locale: 'en_LB',
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
        standfirst="How to request a cancellation or return and what information to provide."
        meta="Last updated 26 August 2026"
      >
      <div>
        <section>
          <h2>Before delivery</h2>
          <p>
            Contact us as soon as possible if you need to cancel. If preparation or delivery has already started, we will tell you what options remain available.
          </p>
        </section>

        <section>
          <h2>How to start a return</h2>
          <p>
            Contact us via{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              WhatsApp
            </a>{' '}
            with your order number and the reason for the request. We will review it under the applicable consumer-protection requirements and confirm the next steps in writing.
          </p>
        </section>

        <section>
          <h2>Condition requirements</h2>
          <p>Keep the item unworn, unwashed, in its original packaging, and with all tags attached while a request is being reviewed.</p>
        </section>

        <section>
          <h2>Approved returns and refunds</h2>
          <p>
            If a return or refund is approved, we will confirm the return method, any applicable delivery cost, and the available refund method before you send the item back. Orders are paid in cash on delivery; no payment card is stored.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
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
