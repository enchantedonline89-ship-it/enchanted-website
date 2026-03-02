import Link from 'next/link'

export const metadata = {
  title: 'Shipping & Delivery — Enchanted Style',
  description: 'Delivery fees, areas, and timelines for Enchanted Style orders in Lebanon.',
}

export default function ShippingPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-muted hover:text-gold text-sm transition-colors mb-8 inline-block">
        ← Back to Home
      </Link>

      <h1 className="font-display text-3xl text-foreground mb-2">Shipping & Delivery</h1>
      <p className="text-muted text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">1. Delivery Areas & Fees</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Beirut &amp; Mount Lebanon: $3</li>
            <li>All other Lebanese regions: $4</li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">2. Estimated Delivery Time</h2>
          <p>1–3 business days within Beirut &amp; Mount Lebanon; 2–5 business days for other regions.</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">3. How It Works</h2>
          <p>Place your order on site → We send you a WhatsApp confirmation → Delivery is coordinated directly with you.</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">4. Order Tracking</h2>
          <p>
            Message us on{' '}
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              WhatsApp
            </a>{' '}
            with your order reference number for a status update.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">5. Questions?</h2>
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
