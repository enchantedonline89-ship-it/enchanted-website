import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Contact us'
const DESCRIPTION = 'WhatsApp is the fastest way to reach us. Instagram and email also work.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/contact',
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

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/contact' }]} />
      <PageShell
        title="Contact us"
        standfirst="WhatsApp is the fastest way to reach us. Instagram and email also work."
        meta="Last updated March 2026"
      >
      <div>
        <section>
          <h2>WhatsApp</h2>
          <p className="mb-4">Our primary contact method.</p>
          <a
            href="https://wa.me/96181351084"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Chat on WhatsApp
          </a>
          <p className="mt-4">
            <a href="https://wa.me/96181351084" className="text-ink hover:underline">
              +961 81 351 084
            </a>
          </p>
        </section>

        <section>
          <h2>Instagram</h2>
          <p>
            <a
              href="https://instagram.com/enchanted.style_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink hover:underline"
            >
              @enchanted.style_
            </a>
          </p>
        </section>

        <section>
          <h2>Location</h2>
          <p>Lebanon</p>
        </section>

        <section>
          <h2>Business hours</h2>
          <p>Monday-Saturday, 10am-8pm (Lebanon time)</p>
        </section>
      </div>
      </PageShell>
    </>
  )
}
