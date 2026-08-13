import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Privacy policy'
const DESCRIPTION = 'What we collect when you order, why we hold it, and how to have it removed.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/privacy',
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

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/privacy' }]} />
      <PageShell
        title="Privacy policy"
        standfirst="What we collect when you order, why we hold it, and how to have it removed."
        meta="Last updated March 2026"
      >
      <div>
        <section>
          <h2>Who we are</h2>
          <p>
            Enchanted Style is a Lebanese women&apos;s fashion brand.
            We sell clothing, shoes, and accessories and process orders via WhatsApp.
            Contact us at{' '}
            <a href="https://wa.me/96181351084" className="text-ink hover:underline">
              +961 81 351 084
            </a>.
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong className="text-ink">Account info:</strong> When you sign in with
              Google, we receive your name, email address, and profile picture from Google.
            </li>
            <li>
              <strong className="text-ink">Order info:</strong> Full name, phone number,
              delivery address, and order details you provide at checkout.
            </li>
            <li>
              <strong className="text-ink">Usage data:</strong> Standard server logs
              (IP address, browser type, pages visited) collected automatically.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use your information</h2>
          <ul>
            <li>To process and fulfill your orders</li>
            <li>To contact you via WhatsApp about your delivery</li>
            <li>To show you your order history on the website</li>
            <li>To improve our website and service</li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-ink">not</strong> sell your data to third
            parties. We do not use your data for advertising.
          </p>
        </section>

        <section>
          <h2>Google sign-In</h2>
          <p>
            We use Google OAuth solely to authenticate your identity. We request only your
            basic profile information (name, email, profile photo). We do not access your
            Google Drive, Gmail, contacts, or any other Google services.
          </p>
        </section>

        <section>
          <h2>Data storage</h2>
          <p>
            Your account and order data is stored securely on{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-ink hover:underline">
              Supabase
            </a>{' '}
            (EU region). We retain order data for up to 3 years for business records.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            You may request deletion of your account and associated data at any time by
            messaging us on WhatsApp. We will process your request within 30 days.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We use only essential cookies for authentication (session token). We do not use
            tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy? Message us on WhatsApp:{' '}
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
