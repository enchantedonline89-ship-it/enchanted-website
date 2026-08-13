import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import Link from 'next/link'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Terms of service'
const DESCRIPTION =
  'The conditions that apply when you browse this catalog and place an order with us.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/terms',
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

export default function TermsPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/terms' }]} />
      <PageShell
        title="Terms of service"
        standfirst="The conditions that apply when you browse this catalog and place an order with us."
        meta="Last updated March 2026"
      >
      <div>
        <section>
          <h2>Who we are</h2>
          <p>
            Enchanted Style is a Lebanese women&apos;s fashion brand. We sell clothing, shoes, and accessories and process orders via WhatsApp. Contact us at{' '}
            <a href="https://wa.me/96181351084" className="text-ink hover:underline">
              wa.me/96181351084
            </a>.
          </p>
        </section>

        <section>
          <h2>Orders and payment</h2>
          <p>
            Orders are placed through our website and confirmed via WhatsApp. All payments are collected on delivery (cash or Whish Money). Prices are displayed in US Dollars (USD).
          </p>
        </section>

        <section>
          <h2>Product descriptions</h2>
          <p>
            We make reasonable efforts to display product colors accurately. Slight variations between screen and physical item may occur due to display settings.
          </p>
        </section>

        <section>
          <h2>Delivery</h2>
          <p>
            Refer to our{' '}
            <Link href="/shipping" className="text-ink hover:underline">
              Shipping Policy
            </Link>.
          </p>
        </section>

        <section>
          <h2>Returns and cancellations</h2>
          <p>
            Refer to our{' '}
            <Link href="/returns" className="text-ink hover:underline">
              Returns Policy
            </Link>. Consumer rights are governed by Lebanese Consumer Protection Law.
          </p>
        </section>

        <section>
          <h2>Limitation of liability</h2>
          <p>
            To the extent permitted by applicable law, Enchanted Style is not liable for indirect, incidental, or consequential damages arising from the use of our products or services beyond the value of the relevant order.
          </p>
        </section>

        <section>
          <h2>Governing Law</h2>
          <p>These terms are governed by the laws of the Republic of Lebanon.</p>
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
