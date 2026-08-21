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
        meta="Last updated 21 August 2026"
      >
      <div>
        <section>
          <h2>Who we are</h2>
          <p>
            Enchanted is a Lebanese women&apos;s fashion store. We sell clothing, shoes,
            and accessories with cash on delivery. Contact us at{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              +961 81 492 994
            </a>.
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong className="text-ink">Account info:</strong> Your name and email,
              plus a profile picture if you choose Google Sign-In.
            </li>
            <li>
              <strong className="text-ink">Order info:</strong> Full name, phone number,
              saved Lebanon delivery addresses, and order details you provide at checkout.
            </li>
            <li>
              <strong className="text-ink">Usage and diagnostics:</strong> Standard
              server logs (IP address, browser type, pages visited). When analytics or
              error monitoring is enabled, we may also collect page interactions and
              masked diagnostic replays. Checkout text and form inputs are masked.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use your information</h2>
          <ul>
            <li>To process and fulfill your orders</li>
            <li>To email order confirmations and status updates</li>
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
            Account, address, catalog and order records are stored in Cloudflare D1;
            product media is stored in Cloudflare R2. Transactional email is handled by
            Resend. If you consent, PostHog processes product analytics and Sentry may
            process masked diagnostic replays. We keep order records only as long as
            reasonably required for fulfilment, support and business record obligations.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            You can manage your saved addresses from your account. You may request access,
            correction or deletion by emailing{' '}
            <a href="mailto:Enchantedonline89@gmail.com" className="text-ink hover:underline">
              Enchantedonline89@gmail.com
            </a>{' '}
            or messaging us on WhatsApp. Open orders must be completed or cancelled before
            an account can be deleted.
          </p>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We use essential cookies for authentication. Only after you choose Allow analytics,
            it also stores a first-party identifier in a cookie and local storage so we can
            understand page visits and clicks. We do not use advertising cookies or sell
            this data.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy? Message us on WhatsApp:{' '}
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
