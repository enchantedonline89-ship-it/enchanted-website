import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Enchanted Style',
  description: 'Terms and conditions for using enchanted.style and placing orders.',
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-muted hover:text-gold text-sm transition-colors mb-8 inline-block">
        ← Back to Home
      </Link>

      <h1 className="font-display text-3xl text-foreground mb-2">Terms of Service</h1>
      <p className="text-muted text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">1. Who We Are</h2>
          <p>
            Enchanted Style is a Lebanese women&apos;s fashion brand. We sell clothing, shoes, and accessories and process orders via WhatsApp. Contact us at{' '}
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              wa.me/96181351084
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">2. Orders & Payment</h2>
          <p>
            Orders are placed through our website and confirmed via WhatsApp. All payments are collected on delivery (cash or Whish Money). Prices are displayed in US Dollars (USD).
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">3. Product Descriptions</h2>
          <p>
            We make reasonable efforts to display product colors accurately. Slight variations between screen and physical item may occur due to display settings.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">4. Delivery</h2>
          <p>
            Refer to our{' '}
            <Link href="/shipping" className="text-gold hover:underline">
              Shipping Policy
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">5. Returns & Cancellations</h2>
          <p>
            Refer to our{' '}
            <Link href="/returns" className="text-gold hover:underline">
              Returns Policy
            </Link>. Consumer rights are governed by Lebanese Consumer Protection Law.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">6. Limitation of Liability</h2>
          <p>
            To the extent permitted by applicable law, Enchanted Style is not liable for indirect, incidental, or consequential damages arising from the use of our products or services beyond the value of the relevant order.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">7. Governing Law</h2>
          <p>These terms are governed by the laws of the Republic of Lebanon.</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">8. Contact</h2>
          <p>
            Message us on WhatsApp:{' '}
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              +961 81 351 084
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
