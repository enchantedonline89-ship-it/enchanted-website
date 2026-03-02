import Link from 'next/link'

export const metadata = {
  title: 'Contact Us — Enchanted Style',
  description: 'Get in touch with Enchanted Style via WhatsApp or Instagram.',
}

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-muted hover:text-gold text-sm transition-colors mb-8 inline-block">
        ← Back to Home
      </Link>

      <h1 className="font-display text-3xl text-foreground mb-2">Contact Us</h1>
      <p className="text-muted text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">1. WhatsApp</h2>
          <p className="mb-4">Our primary contact method.</p>
          <a
            href="https://wa.me/96181351084"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#c9a84c] text-sm px-5 py-3 rounded-lg transition-all duration-200"
          >
            Chat on WhatsApp
          </a>
          <p className="mt-4">
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              +961 81 351 084
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">2. Instagram</h2>
          <p>
            <a
              href="https://instagram.com/enchanted.style_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              @enchanted.style_
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">3. Location</h2>
          <p>Lebanon</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">4. Business Hours</h2>
          <p>Monday–Saturday, 10am–8pm (Lebanon time)</p>
        </section>
      </div>
    </div>
  )
}
