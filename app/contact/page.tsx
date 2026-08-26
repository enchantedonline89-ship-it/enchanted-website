import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Contact us'
const DESCRIPTION = 'Contact Enchanted Style by email, WhatsApp, or Instagram.'

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
    locale: 'en_LB',
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
        standfirst="Email us about an order, or start a WhatsApp conversation when you want live help."
        meta="Last updated August 2026"
      >
      <div>
        <section>
          <h2>Email</h2>
          <p><a href="mailto:Enchantedonline89@gmail.com" className="text-ink hover:underline">Enchantedonline89@gmail.com</a></p>
        </section>

        <section>
          <h2>WhatsApp</h2>
          <p className="mb-4">Optional customer-initiated support.</p>
          <a
            href="https://wa.me/96181492994"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Chat on WhatsApp
          </a>
          <p className="mt-4">
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              +961 81 492 994
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

      </div>
      </PageShell>
    </>
  )
}
