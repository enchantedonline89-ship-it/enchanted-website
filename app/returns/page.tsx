import Link from 'next/link'

export const metadata = {
  title: 'Returns & Cancellations — Enchanted Style',
  description: 'Our return and cancellation policy, per Lebanese consumer protection law.',
}

export default function ReturnsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-muted hover:text-gold text-sm transition-colors mb-8 inline-block">
        ← Back to Home
      </Link>

      <h1 className="font-display text-3xl text-foreground mb-2">Returns & Cancellations</h1>
      <p className="text-muted text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">1. Your Right to Cancel</h2>
          <p>
            Per Lebanese Consumer Protection Law, you have 10 days from receipt to cancel your order, provided items are unused, unworn, and have original tags attached.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">2. How to Start a Return</h2>
          <p>
            Contact us via{' '}
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              WhatsApp
            </a>{' '}
            within 10 days with your order reference number; we will arrange pickup or confirm a drop-off point.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">3. Condition Requirements</h2>
          <p>Items must be unworn, unwashed, in original packaging with all tags attached.</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">4. Refund Process</h2>
          <p>
            Refunds are issued via Whish Money or cash on collection within 7 business days of receiving the returned item. Note: all orders are cash on delivery, no card on file.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">5. Non-Returnable Items</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Items marked Final Sale at time of purchase</li>
            <li>Items that have been worn or washed</li>
            <li>Returns initiated after 10 days from receipt</li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">6. Contact</h2>
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
