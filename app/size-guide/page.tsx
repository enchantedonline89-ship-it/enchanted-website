import Link from 'next/link'

export const metadata = {
  title: 'Size Guide — Enchanted Style',
  description: 'Footwear and clothing size charts for Enchanted Style fashion.',
}

export default function SizeGuidePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-muted hover:text-gold text-sm transition-colors mb-8 inline-block">
        ← Back to Home
      </Link>

      <h1 className="font-display text-3xl text-foreground mb-2">Size Guide</h1>
      <p className="text-muted text-sm mb-10">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">1. Footwear Sizes</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">EU</th>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">UK</th>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">US Women&apos;s</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2 pr-6">36</td><td className="py-2 pr-6">3</td><td className="py-2 pr-6">5.5</td></tr>
              <tr><td className="py-2 pr-6">37</td><td className="py-2 pr-6">4</td><td className="py-2 pr-6">6.5</td></tr>
              <tr><td className="py-2 pr-6">38</td><td className="py-2 pr-6">5</td><td className="py-2 pr-6">7.5</td></tr>
              <tr><td className="py-2 pr-6">39</td><td className="py-2 pr-6">6</td><td className="py-2 pr-6">8.5</td></tr>
              <tr><td className="py-2 pr-6">40</td><td className="py-2 pr-6">7</td><td className="py-2 pr-6">9.5</td></tr>
              <tr><td className="py-2 pr-6">41</td><td className="py-2 pr-6">8</td><td className="py-2 pr-6">10.5</td></tr>
            </tbody>
          </table>
          <p className="mt-3">If you are between sizes, we recommend sizing up.</p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">2. Clothing Sizes</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">Size</th>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">Bust (cm)</th>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">Waist (cm)</th>
                <th className="text-left py-2 pr-6 text-foreground font-semibold">Hips (cm)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2 pr-6">XS</td><td className="py-2 pr-6">82–84</td><td className="py-2 pr-6">62–64</td><td className="py-2 pr-6">88–90</td></tr>
              <tr><td className="py-2 pr-6">S</td><td className="py-2 pr-6">86–88</td><td className="py-2 pr-6">66–68</td><td className="py-2 pr-6">92–94</td></tr>
              <tr><td className="py-2 pr-6">M</td><td className="py-2 pr-6">90–92</td><td className="py-2 pr-6">70–72</td><td className="py-2 pr-6">96–98</td></tr>
              <tr><td className="py-2 pr-6">L</td><td className="py-2 pr-6">94–96</td><td className="py-2 pr-6">74–76</td><td className="py-2 pr-6">100–102</td></tr>
              <tr><td className="py-2 pr-6">XL</td><td className="py-2 pr-6">98–100</td><td className="py-2 pr-6">78–80</td><td className="py-2 pr-6">104–106</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">3. Fit Tips</h2>
          <p>
            Not sure which size to order? Send us your measurements on{' '}
            <a href="https://wa.me/96181351084" className="text-gold hover:underline">
              WhatsApp
            </a>{' '}
            and we&apos;ll tell you exactly what to choose.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold text-base mb-3">4. Still Not Sure?</h2>
          <a
            href="https://wa.me/96181351084"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#c9a84c] text-sm px-5 py-3 rounded-lg transition-all duration-200"
          >
            Chat on WhatsApp
          </a>
        </section>
      </div>
    </div>
  )
}
