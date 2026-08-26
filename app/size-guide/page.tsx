import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import { SITE_NAME } from '@/components/seo/site'

const TITLE = 'Size guide'
const DESCRIPTION = 'Footwear and clothing charts, plus how our sizes actually run.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/size-guide' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/size-guide',
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

export default function SizeGuidePage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: TITLE, path: '/size-guide' }]} />
      <PageShell
        title="Size guide"
        standfirst="Footwear and clothing charts, plus how our sizes actually run."
        meta="Last updated August 2026"
      >
      <div>
        <section>
          <h2>Footwear sizes</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 text-ink font-semibold">EU</th>
                <th className="text-left py-2 pr-6 text-ink font-semibold">UK</th>
                <th className="text-left py-2 pr-6 text-ink font-semibold">US Women&apos;s</th>
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
          <h2>Clothing sizes</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 text-ink font-semibold">Size</th>
                <th className="text-left py-2 pr-6 text-ink font-semibold">Bust (cm)</th>
                <th className="text-left py-2 pr-6 text-ink font-semibold">Waist (cm)</th>
                <th className="text-left py-2 pr-6 text-ink font-semibold">Hips (cm)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="py-2 pr-6">XS</td><td className="py-2 pr-6">82-84</td><td className="py-2 pr-6">62-64</td><td className="py-2 pr-6">88-90</td></tr>
              <tr><td className="py-2 pr-6">S</td><td className="py-2 pr-6">86-88</td><td className="py-2 pr-6">66-68</td><td className="py-2 pr-6">92-94</td></tr>
              <tr><td className="py-2 pr-6">M</td><td className="py-2 pr-6">90-92</td><td className="py-2 pr-6">70-72</td><td className="py-2 pr-6">96-98</td></tr>
              <tr><td className="py-2 pr-6">L</td><td className="py-2 pr-6">94-96</td><td className="py-2 pr-6">74-76</td><td className="py-2 pr-6">100-102</td></tr>
              <tr><td className="py-2 pr-6">XL</td><td className="py-2 pr-6">98-100</td><td className="py-2 pr-6">78-80</td><td className="py-2 pr-6">104-106</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Fit tips</h2>
          <p>
            Not sure which size to order? Send us your measurements on{' '}
            <a href="https://wa.me/96181492994" className="text-ink hover:underline">
              WhatsApp
            </a>{' '}
            and we&apos;ll help you choose.
          </p>
        </section>

        <section>
          <h2>Still not sure?</h2>
          <a
            href="https://wa.me/96181492994"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Chat on WhatsApp
          </a>
        </section>
      </div>
      </PageShell>
    </>
  )
}
